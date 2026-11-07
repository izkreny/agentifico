# frozen_string_literal: true

# WHY: it asks the installed RuboCop rather than reading its default.yml, because only RuboCop applies Preview and plugin defaults the way a real run does.

require "open3"
require "optparse"
require "rbconfig"
require "tmpdir"
require "yaml"

# The floor check: assets/floor.yml, RuboCop's answers about it, and the release gap.
module CheckFloor
  SKILL = File.expand_path("..", __dir__)
  FLOOR = File.join(SKILL, "assets", "floor.yml")
  REPOS = {
    "rubocop" => "rubocop/rubocop",
    "rubocop-performance" => "rubocop/rubocop-performance",
    "rubocop-minitest" => "rubocop/rubocop-minitest",
    "rubocop-thread_safety" => "rubocop/rubocop-thread_safety",
    "rubocop-on-rbs" => "ksss/rubocop-on-rbs",
  }.freeze

  Gap = Data.define(:name, :checked, :installed, :spec)
  private_constant :SKILL, :FLOOR, :REPOS, :Gap

  # Asks RuboCop whether each cop is enabled under a config, the way `--show-cops` reports it.
  class ShowCops
    def initialize(cops)
      @cops = cops
    end

    def states(config)
      out, err, status = Open3.capture3(*command(config))
      unless status.success?
        abort "rubocop --show-cops failed; a cop in assets/floor.yml may be missing from this release:\n" \
              "#{err.lines.first(3).join}"
      end
      err.each_line.grep(/\AWarning:/) { puts "RuboCop warns about #{config}: #{it.strip}" }
      parse(out)
    end

    private

    attr_reader :cops

    def command(config)
      [RbConfig.ruby, Gem.bin_path("rubocop", "rubocop"), "--no-server", "--show-cops", cops.join(","), "-c", config]
    end

    def parse(text)
      states = {}
      text.each_line.reduce(nil) do |current, line|
        cop = line[%r{\A([A-Z]\w*(?:/\w+)+):\s*\z}, 1]
        next cop if cop

        state = line[/\A  Enabled: (\S+)/, 1]
        states[current] = state if current && state
        current unless state
      end
      states
    end
  end

  # Lists the cops whose VersionAdded or VersionChanged falls inside one gem's release gap.
  class GapReport
    def initialize(gap)
      @gap = gap
    end

    def print
      puts "Cops added or changed in #{gap.name} after #{gap.checked}, up to #{gap.installed}:"
      default_config.filter_map { |cop, settings| line_for(cop, settings) }.each { puts "  #{it}" }
      puts "  release notes: #{notes_url}"
    end

    private

    attr_reader :gap

    def notes_url
      "https://github.com/#{REPOS.fetch(gap.name)}/compare/v#{gap.checked}...v#{gap.installed}"
    end

    def default_config
      path = File.join(gap.spec.gem_dir, "config", "default.yml")
      YAML.safe_load_file(path, permitted_classes: [Regexp, Symbol], aliases: true)
        .select { |key, value| key.include?("/") && value.is_a?(Hash) }
    end

    def line_for(cop, settings)
      added = in_gap(settings["VersionAdded"])
      changed = in_gap(settings["VersionChanged"])
      return unless added || changed

      what = added ? "added #{added}" : "changed #{changed}"
      preview = settings.key?("Preview") ? ", has Preview defaults" : ""
      "#{cop}: #{what}, Enabled: #{settings["Enabled"]}#{preview}"
    end

    def in_gap(value)
      version = Gem::Version.new(value.to_s)
      version if version > gap.checked && version <= gap.installed
    rescue ArgumentError
      nil
    end
  end

  # Reads the floor, checks every cop in it and prints what changed since the checked versions.
  class Run
    def initialize(config:, record:)
      @config = config
      @record = record
      @floor = YAML.safe_load_file(FLOOR)
      @failures = []
      @older = false
    end

    def call
      gaps = versions
      show = ShowCops.new(owned + watched.keys)
      defaults = defaults_states(show)
      check_owned(defaults, show.states(@config))
      check_watched(defaults)
      gaps.each { GapReport.new(it).print }
      finish(gaps)
    end

    private

    attr_reader :floor, :failures

    def owned = floor.fetch("owned").values.flatten
    def watched = floor.fetch("watched")

    def versions
      puts "Versions (checked -> installed):"
      floor.fetch("checked").filter_map do |name, checked|
        spec = spec_for(name)
        puts "  #{name}: #{checked} -> #{spec ? spec.version : "not installed, its cops cannot be checked"}"
        gap_for(name, Gem::Version.new(checked), spec)
      end
    end

    def spec_for(name)
      Gem.loaded_specs[name] || Gem::Specification.find_by_name(name)
    rescue Gem::MissingSpecError
      nil
    end

    def gap_for(name, checked, spec)
      return unless spec

      if spec.version < checked
        @older = true
        puts "    older than the checked version: the floor may name cops this release lacks"
      end
      Gap.new(name:, checked:, installed: spec.version, spec:) if spec.version > checked
    end

    def defaults_states(show)
      plugins = REPOS.keys.drop(1).select { spec_for(it) }
      Dir.mktmpdir("check-floor") do |dir|
        path = File.join(dir, ".rubocop.yml")
        File.write(path, { "plugins" => plugins }.to_yaml)
        show.states(path)
      end
    end

    def check_owned(defaults, configured)
      puts "Owned cops, which must be enabled by default and under #{@config}:"
      owned.each do |cop|
        problems = problems_for(defaults[cop], configured[cop])
        next if problems.empty?

        failures << cop
        puts "  FAIL #{cop}: #{problems.join(", ")}"
      end
      puts "  all #{owned.size} enabled" if failures.empty?
    end

    def problems_for(by_default, under_config)
      { "by default" => by_default, "under the config" => under_config }
        .filter_map { |where, state| "#{state || "unknown"} #{where}" unless state == "true" }
    end

    def check_watched(defaults)
      puts "Watched pending cops, whose rule the skill states:"
      watched.each do |cop, home|
        state = defaults[cop] || "unknown"
        next puts("  #{cop}: #{state}") unless state == "true"

        failures << cop
        puts "  FAIL #{cop} is now enabled by default: remove its rule from #{home} and add the cop to `owned`"
      end
    end

    def finish(gaps)
      abort "FAILED: #{failures.join(", ")}" if failures.any?
      return puts("OK: no release newer than the checked versions#{", and some are older" if @older}") if gaps.empty?
      return record(gaps) if @record

      puts "OK: read the cops above for rules the skill now leaves to the linter, then run again with --record"
    end

    def record(gaps)
      text = File.read(FLOOR)
      gaps.each do |gap|
        text = text.sub(/^(  #{Regexp.escape(gap.name)}: )\S+$/) { "#{::Regexp.last_match(1)}#{gap.installed}" }
      end
      File.write(FLOOR, text)
      puts "Recorded: #{gaps.map { "#{it.name} #{it.installed}" }.join(", ")}"
    end
  end

  def self.main(argv)
    options = { config: File.join(SKILL, "assets", "rubocop.yml"), record: false }
    parser = OptionParser.new("Usage: bundle exec ruby <skill-dir>/scripts/check_floor.rb [--config PATH] [--record]")
    parser.separator("Run it from the directory of the Gemfile whose bundle holds RuboCop.")
    parser.on("--config PATH", "the RuboCop config to check, by default the skill's assets/rubocop.yml")
    parser.on("--record", "write the installed versions into assets/floor.yml when nothing failed")
    parser.parse!(argv, into: options)
    Run.new(config: File.expand_path(options.fetch(:config)), record: options.fetch(:record)).call
  end
end

CheckFloor.main(ARGV) if $PROGRAM_NAME == __FILE__
