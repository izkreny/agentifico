# frozen_string_literal: true

require "minitest/autorun"
require "rbconfig"
require_relative "../check_floor/show_cops"

describe CheckFloor::ShowCops do
  # WHY: a subclass swaps RuboCop for a Ruby one-liner that replays a canned answer, so these run without RuboCop.
  def show_cops(out:, err: "", status: 0)
    replay = "print ARGV[0]; $stderr.print ARGV[1]; exit ARGV[2].to_i"
    replayer = Class.new(CheckFloor::ShowCops) do
      define_method(:command) { |_config| [RbConfig.ruby, "-e", replay, out, err, status.to_s] }
      private :command
    end
    replayer.new(["Style/GuardClause", "Lint/Debugger"])
  end

  let(:answer) do
    <<~TEXT
      # Supports --autocorrect
      Style/GuardClause:
        Description: Check for conditionals that can be replaced with guard clauses.
        Enabled: true
        MinBodyLength: 1

      Lint/Debugger:
        Enabled: pending
    TEXT
  end

  it "reads each cop's Enabled state" do
    states = show_cops(out: answer).states("a.yml")

    expect(states).must_equal({ "Style/GuardClause" => "true", "Lint/Debugger" => "pending" })
  end

  it "names the cops it knows when RuboCop reports only unknown ones" do
    states = show_cops(out: answer, err: "Unrecognized cop: Qxzv/Wqjk\n", status: 2).states("a.yml")

    expect(states.keys).must_equal ["Style/GuardClause", "Lint/Debugger"]
  end

  it "fails when RuboCop suggests a name for an unknown cop" do
    err = "Unrecognized cop: Style/GuardClaus\nDid you mean? Style/GuardClause\n"

    expect { show_cops(out: answer, err:, status: 2).states("a.yml") }.must_raise CheckFloor::Failure
  end

  it "fails on any other error and quotes it" do
    show = show_cops(out: "", err: "cannot load such file -- rubocop-qxzv\n", status: 2)

    error = expect { show.states("a.yml") }.must_raise CheckFloor::Failure
    expect(error.message).must_match "cannot load such file -- rubocop-qxzv"
  end

  it "passes RuboCop's warnings on without failing" do
    show = show_cops(out: answer, err: "Warning: obsolete parameter\nUnrecognized cop: Qxzv/Wqjk\n", status: 2)

    expect { show.states("a.yml") }.must_output "RuboCop warns about a.yml: Warning: obsolete parameter\n"
  end
end
