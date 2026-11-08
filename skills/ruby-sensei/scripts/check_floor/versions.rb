# frozen_string_literal: true

require_relative "common"

module CheckFloor
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
end
