# Differential check: parse the frontmatter with a real YAML parser (Ruby
# stdlib) and compare the parsed description against the raw line. Any
# difference on a plain scalar means a silent trap fired; a parse error means
# the skill will not load at all.
# Usage: ruby check-differential.rb [target]   (defaults to the current directory)
# The target is a directory of skills, or one skill's own directory.
require "yaml"
Dir.chdir(ARGV[0]) if ARGV[0]
targets = File.exist?("SKILL.md") ? ["SKILL.md"] : Dir["*/SKILL.md"].sort
defects = 0
targets.each do |p|
  fm = File.read(p)[/\A---\n(.*?)\n---/m, 1] or next
  begin
    d = YAML.safe_load(fm)["description"]
  rescue => e
    puts "#{p}  PARSE ERROR, skill will not load: #{e.message.lines.first.strip}"
    defects += 1
    next
  end
  unless d.is_a?(String) || d.nil?
    puts "#{p}  description is #{d.class}, not a string"
    defects += 1
  end
  raw = fm.lines.find { |l| l.start_with?("description:") }.to_s.sub("description:", "").strip
  next if raw.empty? || raw =~ /\A[|>"']/
  if d != raw
    puts "#{p}  SILENTLY MUTATED: raw line says #{raw.inspect} but parses as #{d.inspect}"
    defects += 1
  end
end
# Checking nothing is a failure, for the same reason as in the sweep.
if targets.empty?
  puts "differential: no SKILL.md found in #{Dir.pwd}, nothing was checked"
else
  puts "differential: #{targets.length} skill(s) checked, #{defects} with defects"
end
exit(defects.zero? && !targets.empty? ? 0 : 1)
