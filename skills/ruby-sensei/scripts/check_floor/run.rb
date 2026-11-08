# frozen_string_literal: true

require "bundler"
require "tmpdir"
require "yaml"
require_relative "common"
require_relative "gap_report"
require_relative "show_cops"
require_relative "versions"

module CheckFloor
  # Reads the floor, checks every cop in it and prints what changed since the pinned versions.
  class Run
    def initialize(config:)
      @config = config
      @floor = YAML.safe_load_file(FLOOR)
      @versions = Versions.new(pinned)
      @failures = []
    end

    def call
      versions.print
      check_cops
      gaps.each { GapReport.new(it).print }
      finish
    end

    private

    attr_reader :config, :floor, :versions, :failures

    def pinned
      specs = Bundler::LockfileParser.new(File.read(LOCK)).specs.to_h { [it.name, it.version.to_s] }
      GEMS.keys.filter_map { |name| [name, specs[name]] if specs.key?(name) }.to_h
    end

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

      puts "OK: read the cops above for rules the skill now leaves to the linter"
      puts "  the skill's maintainer moves the pins in the skill's Gemfile, in the skill's source repository"
    end

    def finish_without_gaps
      return puts("OK: no release newer than the pinned versions, and some are older") if versions.older?

      puts "OK: no release newer than the pinned versions"
    end
  end
end
