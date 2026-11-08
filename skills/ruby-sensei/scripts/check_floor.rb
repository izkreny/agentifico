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
  GEMS = {
    "rubocop" => { repo: "rubocop/rubocop" },
    "rubocop-performance" => { repo: "rubocop/rubocop-performance", department: "Performance" },
    "rubocop-minitest" => { repo: "rubocop/rubocop-minitest", department: "Minitest" },
    "rubocop-thread_safety" => { repo: "rubocop/rubocop-thread_safety", department: "ThreadSafety" },
    "rubocop-on-rbs" => { repo: "ksss/rubocop-on-rbs", department: "RBS" },
  }.freeze

  Gap = Data.define(:name, :checked, :installed, :spec)
  private_constant :SKILL, :FLOOR, :GEMS, :Gap

  # Raised for a check that cannot run or does not pass; only `main` turns it into an exit.
  class Failure < StandardError; end

  # Asks RuboCop whether each cop is enabled under a config, the way `--show-cops` reports it.
  class ShowCops
    def initialize(cops)
      @cops = cops
    end

    def states(config)
      out, err, status = Open3.capture3(*command(config))
      unless status.success? || only_unknown_cops?(status, err)
        detail = err.lines.first(3).join
        raise Failure, "rubocop --show-cops failed under #{config}: a plugin the config loads may be missing " \
                       "from this bundle, or a cop in assets/floor.yml from this release:\n#{detail}"
      end
      err.each_line.grep(/\AWarning:/) { puts "RuboCop warns about #{config}: #{it.strip}" }
      parse(out)
    end

    private

    attr_reader :cops

    def only_unknown_cops?(status, err)
      errors = err.each_line.grep_v(/\AWarning:/)
      status.exitstatus == 2 && errors.any? && errors.all? { it.start_with?("Unrecognized cop: ") }
    end

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
      "https://github.com/#{GEMS.fetch(gap.name).fetch(:repo)}/compare/v#{gap.checked}...v#{gap.installed}"
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

  # Compares the versions assets/floor.yml records with the gems this bundle has installed.
  class Versions
    def initialize(checked)
      @checked = checked.transform_values { Gem::Version.new(it) }
    end

    def print
      puts "Versions (checked -> installed):"
      checked.each { |name, version| print_one(name, version, spec_for(name)) }
    end

    def gaps
      checked.filter_map do |name, version|
        spec = spec_for(name)
        Gap.new(name:, checked: version, installed: spec.version, spec:) if spec && spec.version > version
      end
    end

    def older?
      checked.any? do |name, version|
        spec = spec_for(name)
        spec && spec.version < version
      end
    end

    def installed?(name) = !spec_for(name).nil?

    private

    attr_reader :checked

    def print_one(name, version, spec)
      return puts("  #{name}: #{version} -> not installed, its cops cannot be checked") unless spec

      puts "  #{name}: #{version} -> #{spec.version}"
      puts "    older than the checked version: the floor may name cops this release lacks" if spec.version < version
    end

    def spec_for(name)
      Gem.loaded_specs[name] || Gem::Specification.find_by_name(name)
    rescue Gem::MissingSpecError
      nil
    end
  end

  # Reads the floor, checks every cop in it and prints what changed since the checked versions.
  class Run
    def initialize(config:, record:)
      raise Failure, "--record records a check of RuboCop's defaults, so it runs without --config" if record && config

      @config = config
      @record = record
      @floor = YAML.safe_load_file(FLOOR)
      @versions = Versions.new(@floor.fetch("checked"))
      @failures = []
    end

    def call
      versions.print
      check_cops
      gaps.each { GapReport.new(it).print }
      finish
    end

    private

    attr_reader :config, :record, :floor, :versions, :failures

    def owned = floor.fetch("owned").values.flatten
    def watched = floor.fetch("watched")
    def gaps = versions.gaps

    def check_cops
      show = ShowCops.new(owned + watched.keys)
      defaults = defaults_states(show)
      check_owned(defaults, config && show.states(config))
      check_watched(defaults)
    end

    def defaults_states(show)
      plugins = GEMS.filter_map { |name, gem| name if gem[:department] && versions.installed?(name) }
      Dir.mktmpdir("check-floor") do |dir|
        path = File.join(dir, ".rubocop.yml")
        File.write(path, { "plugins" => plugins }.to_yaml)
        show.states(path)
      end
    end

    def check_owned(defaults, configured)
      where = config ? "by default and under #{config}" : "by default"
      puts "Owned cops, which must be enabled #{where}:"
      runs = { "by default" => defaults, "under the config" => configured }.compact
      owned.each { |cop| check_one_owned(cop, runs.transform_values { it[cop] }) }
      puts "  all #{owned.size} enabled" if failures.empty?
    end

    def check_one_owned(cop, states)
      problems = states.filter_map { |where, state| "#{state || "unknown"} #{where}" unless state == "true" }
      return if problems.empty?

      failures << cop
      puts "  FAIL #{cop}: #{problems.join(", ")}"
    end

    def check_watched(defaults)
      puts "Watched pending cops, whose rule the skill states:"
      watched.each { |cop, home| check_one_watched(cop, home, defaults[cop]) }
    end

    def check_one_watched(cop, home, state)
      return puts("  #{cop}: #{state}") unless state.nil? || state == "true"

      failures << cop
      puts "  FAIL #{cop} #{watched_problem(cop, home, state)}"
    end

    def watched_problem(cop, home, state)
      return "is now enabled by default: remove its rule from #{home} and add the cop to `owned`" if state

      department = cop.split("/").first
      plugin = GEMS.find { |_, gem| gem[:department] == department }&.first
      return "cannot be checked: its plugin #{plugin} is not installed" if plugin && !versions.installed?(plugin)

      "is unknown to this release: check the rule in #{home} against its notes"
    end

    def finish
      raise Failure, "FAILED: #{failures.join(", ")}" if failures.any?
      return finish_without_gaps if gaps.empty?
      return write_versions if record

      puts "OK: read the cops above for rules the skill now leaves to the linter"
      puts "  the skill's maintainer records the new versions with --record, in the skill's source repository"
    end

    def finish_without_gaps
      return puts("OK: no release newer than the checked versions, and some are older") if versions.older?

      puts "OK: no release newer than the checked versions"
    end

    def write_versions
      text = File.read(FLOOR)
      gaps.each do |gap|
        text = text.sub(/^(  #{Regexp.escape(gap.name)}: )\S+$/) { "#{::Regexp.last_match(1)}#{gap.installed}" }
      end
      File.write(FLOOR, text)
      recorded = gaps.map { "#{it.name} #{it.installed}" }.join(", ")
      puts "Recorded: #{recorded}"
    end
  end

  def self.main(argv)
    options = { record: false }
    parser = OptionParser.new("Usage: bundle exec ruby <skill-dir>/scripts/check_floor.rb [--config PATH] [--record]")
    parser.separator("Run it from the directory of the Gemfile whose bundle holds RuboCop.")
    parser.on("--config PATH", "also check the owned cops under this RuboCop config")
    parser.on("--record", "for the skill's maintainer, in its source repository: record the installed versions")
    parser.parse!(argv, into: options)
    Run.new(config: options[:config]&.then { real_config(it) }, record: options.fetch(:record)).call
  rescue Failure => e
    abort e.message
  end

  def self.real_config(path)
    File.realpath(path)
  rescue Errno::ENOENT
    raise Failure, "no RuboCop config at #{path}"
  end
  private_class_method :real_config
end

CheckFloor.main(ARGV) if $PROGRAM_NAME == __FILE__
