# frozen_string_literal: true

require "optparse"
require_relative "common"
require_relative "run"

module CheckFloor
  # Reads the command line, runs the check, and turns a failure into the exit status.
  module CLI
    def self.call(argv)
      options = {}
      parser = OptionParser.new("Usage: bundle exec ruby <skill-dir>/scripts/check_floor.rb [--config PATH]")
      parser.separator("Run it from the directory of the Gemfile whose bundle holds RuboCop.")
      parser.on("--config PATH", "also check the owned cops under this RuboCop config")
      parser.parse!(argv, into: options)
      Run.new(config: options[:config]&.then { real_config(it) }).call
    rescue Failure, OptionParser::ParseError => e
      abort e.message
    end

    def self.real_config(path)
      File.realpath(path)
    rescue Errno::ENOENT
      raise Failure, "no RuboCop config at #{path}"
    end
    private_class_method :real_config
  end
end
