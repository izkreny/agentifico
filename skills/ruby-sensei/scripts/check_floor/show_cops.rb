# frozen_string_literal: true

# WHY: it asks the installed RuboCop rather than reading its default.yml, because only RuboCop applies Preview and plugin defaults the way a real run does.

require "open3"
require "rbconfig"
require_relative "common"

module CheckFloor
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
      [RbConfig.ruby, rubocop, "--no-server", "--show-cops", cops.join(","), "-c", config]
    end

    def rubocop
      Gem.bin_path("rubocop", "rubocop")
    rescue Gem::Exception
      raise Failure, "RuboCop is not installed in this bundle"
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
end
