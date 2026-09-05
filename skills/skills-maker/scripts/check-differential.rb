# Differential check: parse the frontmatter with a real YAML parser (Ruby
# stdlib) and compare the parsed description against the raw line. Any
# difference on a plain scalar means a silent trap fired; a parse error means
# the skill will not load at all.
# Usage: ruby check-differential.rb [target]   (defaults to the current directory)
# The target is one skill's own directory, a directory of skills, or a package
# root whose skills sit further down - a plugin's at <root>/skills/.
require "yaml"
Dir.chdir(ARGV[0]) if ARGV[0]
# The same discovery rule as the sweep, and for the same reasons: symlinks are
# followed because an agent's skills directory is a directory of them, realpath
# bounds the cycles, and the descent stops at each skill.
def collect(dir, found, seen)
  real = (File.realpath(dir) rescue return)
  return if seen.include?(real)
  seen << real
  entries = (Dir.children(dir).sort rescue return)
  if entries.include?("SKILL.md")
    found << dir
    return
  end
  entries.each do |e|
    next if e.start_with?(".")
    p = File.join(dir, e)
    collect(p, found, seen) if File.directory?(p)
  end
end
dirs = []
collect(".", dirs, [])
# Reported by the path relative to the target, so two plugins each shipping a
# skill called review stay tellable apart.
targets = dirs.map { |d| d == "." ? "SKILL.md" : File.join(d.sub(%r{\A\./}, ""), "SKILL.md") }
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
