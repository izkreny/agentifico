# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "tmpdir"
require "yaml"
require_relative "../check_floor/gap_report"

describe CheckFloor::GapReport do
  let(:gem_dir) { Dir.mktmpdir("gap-report") }

  after { FileUtils.rm_rf(gem_dir) }

  def report(cops)
    FileUtils.mkdir_p(File.join(gem_dir, "config"))
    File.write(File.join(gem_dir, "config", "default.yml"), cops.to_yaml)
    gap = CheckFloor.const_get(:Gap).new(
      name: "rubocop",
      checked: Gem::Version.new("1.90"),
      installed: Gem::Version.new("1.92"),
      spec: Data.define(:gem_dir).new(gem_dir),
    )
    CheckFloor::GapReport.new(gap)
  end

  it "lists the cops added or changed after the checked version, up to the installed one" do
    cops = {
      "AllCops" => { "NewCops" => "pending" },
      "Lint/AtChecked" => { "VersionAdded" => "1.90", "Enabled" => true },
      "Lint/Added" => { "VersionAdded" => "1.91", "Enabled" => "pending", "Preview" => { "Enabled" => true } },
      "Lint/Changed" => { "VersionAdded" => "0.50", "VersionChanged" => "1.92", "Enabled" => true },
      "Lint/Later" => { "VersionAdded" => "1.93", "Enabled" => "pending" },
      "Lint/Unreleased" => { "VersionAdded" => "<<next>>", "Enabled" => "pending" },
    }

    expect { report(cops).print }.must_output <<~TEXT
      Cops added or changed in rubocop after 1.90, up to 1.92:
        Lint/Added: added 1.91, Enabled: pending, has Preview defaults
        Lint/Changed: changed 1.92, Enabled: true
        release notes: https://github.com/rubocop/rubocop/compare/v1.90...v1.92
    TEXT
  end
end
