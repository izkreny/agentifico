# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "rbconfig"

# WHY: these fail before any RuboCop run starts, so they need no bundle that holds RuboCop.
describe "scripts/check_floor.rb on a bad command line" do
  def check(*)
    Open3.capture2e(RbConfig.ruby, File.expand_path("../check_floor.rb", __dir__), *)
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
