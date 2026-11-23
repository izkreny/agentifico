# frozen_string_literal: true

require "bundler"
require "minitest/autorun"
require "open3"
require "rbconfig"
require "tmpdir"

# WHY: these fail before any RuboCop run starts, so they need no bundle that holds RuboCop.
describe "scripts/check_floor.rb when it cannot run" do
  def check(*, env: {})
    Open3.capture2e(env, RbConfig.ruby, File.expand_path("../check_floor.rb", __dir__), *)
  end

  it "names a bundle that holds no RuboCop" do
    out, status = Dir.mktmpdir("no-gems") do |gems|
      Bundler.with_unbundled_env { check(env: { "GEM_HOME" => gems, "GEM_PATH" => gems }) }
    end

    expect(status.success?).must_equal false
    expect(out).must_match(/^RuboCop is not installed in this bundle$/)
    expect(out).wont_match "GemNotFoundException"
  end

  it "names a bundle that holds no RuboCop when run with bundle exec" do
    script = File.expand_path("../check_floor.rb", __dir__)
    out, status = Dir.mktmpdir("empty-bundle") do |dir|
      gemfile = File.join(dir, "Gemfile")
      File.write(gemfile, "source \"https://rubygems.org\"\n")
      Bundler.with_unbundled_env do
        Open3.capture2e({ "BUNDLE_GEMFILE" => gemfile }, "bundle", "exec", RbConfig.ruby, script, chdir: dir)
      end
    end

    expect(status.success?).must_equal false
    expect(out).must_match(/^RuboCop is not installed in this bundle$/)
    expect(out).wont_match "Gem::Exception"
  end

  it "names an unknown option and exits without a backtrace" do
    out, status = check("--confg", "x")

    expect(status.success?).must_equal false
    expect(out).must_match(/\Ainvalid option: --confg$/)
    expect(out).wont_match "OptionParser::InvalidOption"
  end

  it "names an option missing its argument" do
    out, status = check("--config")

    expect(status.success?).must_equal false
    expect(out).must_equal "missing argument: --config\n"
  end
end
