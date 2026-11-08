# frozen_string_literal: true

require "minitest/autorun"
require_relative "../check_floor/versions"

# WHY: these compare against minitest itself, the one gem certain to be loaded while they run.
describe CheckFloor::Versions do
  let(:installed) { Gem.loaded_specs.fetch("minitest").version }

  it "reports a gap for a gem installed newer than the pinned version" do
    gaps = CheckFloor::Versions.new("minitest" => "0.0.1").gaps

    expect(gaps.map { [it.name, it.checked.to_s, it.installed] }).must_equal [["minitest", "0.0.1", installed]]
  end

  it "reports no gap and an older release for a gem installed older than the pinned version" do
    versions = CheckFloor::Versions.new("minitest" => "999.0.0")

    expect(versions.gaps).must_be_empty
    expect(versions.older?).must_equal true
    expect { versions.print }.must_output(/older than the pinned version/)
  end

  it "names a gem that is not installed and finds no gap in it" do
    versions = CheckFloor::Versions.new("qxzv-not-a-gem" => "1.0.0")

    expect(versions.installed?("qxzv-not-a-gem")).must_equal false
    expect(versions.gaps).must_be_empty
    expect { versions.print }.must_output <<~TEXT
      Versions (pinned -> installed):
        qxzv-not-a-gem: 1.0.0 -> not installed, its cops cannot be checked
    TEXT
  end
end
