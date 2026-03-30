#!/usr/bin/env ruby
# frozen_string_literal: true

require "net/http"
require "uri"
require "fileutils"

SKILL_DIR  = File.expand_path("..", __dir__)
SOURCE_URL = "https://daisyui.com/llms.txt"

REQUIRED_HEADERS = [
  "daisyUI 5 usage rules",
  "daisyUI 5 colors",
  "daisyUI 5 components",
].freeze

SKILL_HEADERS = [
  "daisyUI 5 usage rules",
  "daisyUI 5 colors",
].freeze

REFERENCE_HEADERS = [
  "daisyUI 5 components",
].freeze

FRONTMATTER = <<~YAML
  ---
  name: daisyui-designer
  description: 'Design UI with daisyUI 5 component classes for Tailwind CSS 4. Use for ERB views, HTML templates, component styling, responsive layouts, theme colors, and DaisyUI class names.'
  ---
YAML

# --- Download ---

def fetch(url, limit: 5)
  raise "Too many redirects" if limit.zero?

  uri      = URI(url)
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
    http.request(Net::HTTP::Get.new(uri))
  end

  case response
  when Net::HTTPSuccess     then response.body
  when Net::HTTPRedirection then fetch(response["location"], limit: limit - 1)
  else response.value # raises Net::HTTPError
  end
end

# --- Parse ---

def strip_frontmatter(text)
  text.sub(/\A---.*?---\s*/m, "")
end

def split_sections(body)
  chunks = body.split("\n## ")
  intro  = chunks.shift # everything before the first ## heading

  sections = {}
  chunks.each do |chunk|
    heading, body_text = chunk.split("\n", 2)
    sections[heading.strip] = body_text.to_s
  end

  [intro, sections]
end

def validate!(sections)
  missing = REQUIRED_HEADERS - sections.keys
  return if missing.empty?

  raise "Structure of the document has changed! Missing sections: #{missing.join(', ')}"
end

# --- Assemble ---

def build_skill_md(intro, sections)
  parts = [FRONTMATTER, "\n", intro.strip, "\n"]

  SKILL_HEADERS.each do |header|
    parts << "\n## #{header}\n#{sections[header]}"
  end

  parts.join
end

def build_reference_md(sections)
  parts = []

  REFERENCE_HEADERS.each do |header|
    parts << "## #{header}\n#{sections[header]}"
  end

  parts.join
end

# --- Write ---

def write(path, content)
  FileUtils.mkdir_p(File.dirname(path))
  File.write(path, content)
  puts "  wrote #{path}"
end

# --- Main ---

puts "Fetching #{SOURCE_URL}..."
raw = fetch(SOURCE_URL)

readme_path = File.join(SKILL_DIR, "README.md")
if File.exist?(readme_path)
  backup_path = File.join(SKILL_DIR, "README_old.md")
  FileUtils.cp(readme_path, backup_path)
  puts "  backed up README.md → README_old.md"
end

write(readme_path, raw)

body            = strip_frontmatter(raw)
intro, sections = split_sections(body)
validate!(sections)

skill_md     = build_skill_md(intro, sections)
reference_md = build_reference_md(sections)

write(File.join(SKILL_DIR, "SKILL.md"), skill_md)
write(File.join(SKILL_DIR, "references", "REFERENCE.md"), reference_md)

puts "Done!"
