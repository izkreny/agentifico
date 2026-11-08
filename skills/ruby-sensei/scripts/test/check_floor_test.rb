# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "rbconfig"
require "tmpdir"
require "yaml"

# WHY: it runs the real command against RuboCop, on a copy of the skill whose floor and pins each test writes, so the ones the skill ships are never touched.
describe "scripts/check_floor.rb" do
  let(:skill) { Dir.mktmpdir("check-floor") }
  let(:floor) { File.join(skill, "assets", "floor.yml") }
  let(:preview_config) { File.join(skill, "preview.rubocop.yml") }

  before do
    skip "this bundle does not hold RuboCop" unless Gem.loaded_specs.key?("rubocop")

    scripts = File.expand_path("..", __dir__)
    FileUtils.mkdir_p([File.join(skill, "assets"), File.join(skill, "scripts")])
    sources = [File.join(scripts, "check_floor.rb"), File.join(scripts, "check_floor")]
    FileUtils.cp_r(sources, File.join(skill, "scripts"))
    File.write(preview_config, { "AllCops" => { "Preview" => true } }.to_yaml)
  end

  after { FileUtils.rm_rf(skill) }

  def write_floor(pinned: "999.0.0", watched: {})
    owned = { "Core" => ["Lint/Debugger", "Style/GuardClause"] }
    File.write(floor, { "owned" => owned, "watched" => watched }.to_yaml)
    File.write(File.join(skill, "Gemfile.lock"), <<~LOCK)
      GEM
        remote: https://rubygems.org/
        specs:
          rubocop (#{pinned})
    LOCK
  end

  def check(*)
    Open3.capture2e("bundle", "exec", RbConfig.ruby, File.join(skill, "scripts", "check_floor.rb"), *)
  end

  it "passes when every owned cop is enabled by default" do
    write_floor
    out, status = check

    expect(status.success?).must_equal true, out
    expect(out).must_match "Owned cops, which must be enabled by default:\n  all 2 enabled"
  end

  it "fails a watched cop the release lacks" do
    write_floor(watched: { "Qxzv/Wqjk" => "references/methods.md *Names*" })
    out, status = check

    expect(status.success?).must_equal false, out
    expect(out).must_match "FAIL Qxzv/Wqjk is unknown to this release: check the rule in references/methods.md *Names*"
  end

  it "fails an owned cop that a config switches off" do
    write_floor
    out, status = check("--config", preview_config)

    expect(status.success?).must_equal false, out
    expect(out).must_match "FAIL Style/GuardClause: false under the config"
  end

  it "names a config that does not exist" do
    write_floor
    out, status = check("--config", File.join(skill, "missing.yml"))

    expect(status.success?).must_equal false, out
    expect(out).must_equal "no RuboCop config at #{File.join(skill, "missing.yml")}\n"
  end

  it "lists the release gap when the bundle is newer than the pins" do
    write_floor(pinned: "0.1.0")
    out, status = check

    expect(status.success?).must_equal true, out
    expect(out).must_match(/^Cops added or changed in rubocop after 0\.1\.0, up to \d+\.\d+\.\d+:$/)
    expect(out).must_match "the skill's maintainer moves the pins in the skill's Gemfile"
  end
end
