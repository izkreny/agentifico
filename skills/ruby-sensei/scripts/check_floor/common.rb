# frozen_string_literal: true

# The floor check: assets/floor.yml, RuboCop's answers about it, and the release gap.
module CheckFloor
  SKILL = File.expand_path("../..", __dir__)
  FLOOR = File.join(SKILL, "assets", "floor.yml")
  LOCK = File.join(SKILL, "Gemfile.lock")
  GEMS = {
    "rubocop" => { repo: "rubocop/rubocop" },
    "rubocop-performance" => { repo: "rubocop/rubocop-performance", department: "Performance" },
    "rubocop-minitest" => { repo: "rubocop/rubocop-minitest", department: "Minitest" },
    "rubocop-thread_safety" => { repo: "rubocop/rubocop-thread_safety", department: "ThreadSafety" },
    "rubocop-on-rbs" => { repo: "ksss/rubocop-on-rbs", department: "RBS" },
  }.freeze

  Gap = Data.define(:name, :checked, :installed, :spec)
  private_constant :SKILL, :FLOOR, :LOCK, :GEMS, :Gap

  # Raised for a check that cannot run or does not pass; only the CLI turns it into an exit.
  class Failure < StandardError; end
end
