# frozen_string_literal: true

require "yaml"
require_relative "common"

module CheckFloor
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
end
