const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const through2 = require('through2')
const tmp = require('tmp')
const os = require('os')

const section = ['\\section{', '\\subsection{', '\\subsubsection{']
const extensions = {
  '.cc': 'C++',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.c': 'C',
  '.java': 'Java',
  '.py': 'Python',
  '.tex': 'Tex',
  '.go': 'Golang'
}

function escapeLatex (text) {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/&/g, '\\&')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}')
    .replace(/%/g, '\\%')
}

function sanitizeFileContent (content) {
  // If content is a buffer, convert to string
  if (Buffer.isBuffer(content)) {
    content = content.toString('utf8')
  }
  
  // Remove or replace problematic characters that cause LaTeX issues
  // Replace invalid UTF-8 replacement characters (�) and similar with space
  content = content.replace(/\uFFFD/g, ' ')
  content = content.replace(/[\uFFFE\uFFFF]/g, ' ')
  
  // Remove sequences that look like invalid UTF-8 byte patterns
  // This catches patterns like \lst@EC that appear in error messages
  content = content.replace(/\\lst@EC[^\s\n]*/g, '')
  
  // Replace other problematic Unicode characters that listings can't handle
  // Replace various dash/hyphen types with regular hyphen
  content = content.replace(/[\u2010-\u2015\u2212\uFE63\uFF0D]/g, '-')
  
  // Replace smart quotes with regular quotes
  content = content.replace(/[\u2018\u2019]/g, "'")
  content = content.replace(/[\u201C\u201D]/g, '"')
  
  // Replace other problematic Unicode punctuation
  content = content.replace(/[\u2026]/g, '...') // ellipsis
  content = content.replace(/[\u00A0]/g, ' ') // non-breaking space
  
  // Remove any remaining non-printable control characters except newlines and tabs
  content = content.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
  
  return content
}

function readFileSafe (filePath) {
  try {
    // Read as buffer first to handle encoding issues
    const buffer = fs.readFileSync(filePath)
    
    // Try UTF-8 first
    let content = buffer.toString('utf8')
    
    // If we got replacement characters, the file isn't valid UTF-8
    if (content.includes('\uFFFD')) {
      // Try latin1 encoding
      content = buffer.toString('latin1')
      // Convert problematic latin1 characters to safe ASCII
      // Keep printable ASCII (0x20-0x7E) and common whitespace
      content = content.split('').map(function (char) {
        const code = char.charCodeAt(0)
        // Keep ASCII printable and common control chars (newline, tab, etc)
        if (code >= 0x20 && code <= 0x7E) return char
        if (code === 0x09 || code === 0x0A || code === 0x0D) return char
        // Replace everything else with space
        return ' '
      }).join('')
    }
    
    return sanitizeFileContent(content)
  } catch (err) {
    console.error(`[notebookgen] Warning: Failed to read file ${filePath}:`, err.message)
    return `% Error reading file: ${err.message}\n`
  }
}

function walkToStream(_path, depth, output, onFile) {
  // multicol package keeps all content in memory, so avoid buffering here
  depth = Math.min(depth, section.length - 1)
  fs.readdirSync(_path).forEach(function (file) {
    if (file.startsWith('.')) {
      return // hidden directory
    }
    const f = path.resolve(_path, file)
    const stat = fs.lstatSync(f)
    if (stat.isDirectory()) {
      const title = '\\text{ ' + escapeLatex(file) + ' }'
      output.write('\n' + section[depth] + title + '}\n')
      walkToStream(f, depth + 1, output, onFile)
    } else if (path.extname(f) in extensions) {
      const title = '\\text{ ' + escapeLatex(file.split('.')[0]) + ' }'
      output.write('\n' + section[depth] + title + '}\n')
      const fileContent = readFileSafe(f)
      if (path.extname(f) !== '.tex') {
        output.write(`\\begin{lstlisting}[language=${extensions[path.extname(f)]}]\n`)
        output.write(fileContent)
        output.write('\\end{lstlisting}\n')
      } else {
        output.write(fileContent)
      }
      if (onFile) onFile()
    }
  })
}

function collectFiles(_path, acc) {
  acc = acc || []
  fs.readdirSync(_path).forEach(function (file) {
    if (file.startsWith('.')) return
    const f = path.resolve(_path, file)
    const stat = fs.lstatSync(f)
    if (stat.isDirectory()) {
      collectFiles(f, acc)
    } else if (path.extname(f) in extensions) {
      acc.push(f)
    }
  })
  return acc
}

/**
 * pdf must be generated twice in order to generate the table of contents.
 * According to some tests, in windows it must be generated 3 times.
 * */
function genpdf(ans, texPath, tmpobj, iter) {
  const totalIters = process.platform === 'win32' ? 2 : 1
  const currentIter = totalIters - iter
  console.log(`[notebookgen] Running pdflatex (iteration ${currentIter}/${totalIters})...`)
  
  const tex = spawn('pdflatex', [
    '-interaction=nonstopmode',
    texPath
  ], {
    cwd: tmpobj.name,
    env: process.env
  })

  let hasOutput = false
  tex.stdout.on('data', function (data) {
    hasOutput = true
    // Only show important lines to avoid spam
    const lines = data.toString().split('\n')
    lines.forEach(function (line) {
      if (line.includes('Output written') || line.includes('Transcript written') || line.includes('Error') || line.includes('Warning')) {
        process.stdout.write('[pdflatex] ' + line + '\n')
      }
    })
  })

  tex.stderr.on('data', function (data) {
    process.stderr.write('[pdflatex] ' + data.toString())
  })

  tex.on('error', function (err) {
    console.error('[notebookgen] pdflatex error:', err)
  })

  tex.on('exit', function (code, signal) {
    const outputFile = texPath.split('.')[0] + '.pdf'
    fs.access(outputFile, function (err) {
      if (err) {
        console.error(`[notebookgen] PDF not generated (exit code: ${code}, signal: ${signal})`)
        return
      }
      if (iter === 0) {
        console.log('[notebookgen] PDF generation complete!')
        const s = fs.createReadStream(outputFile)
        s.pipe(ans)
        s.on('close', function () {
          tmpobj.removeCallback()
        })
      } else {
        console.log(`[notebookgen] Completed iteration ${currentIter}/${totalIters}, running next iteration...`)
        genpdf(ans, texPath, tmpobj, iter - 1)
      }
    })
  })
}

function pdflatexFromPath(texPath, tmpobj) {
  const ans = through2()
  ans.readable = true
  const iters = process.platform === 'win32' ? 2 : 1
  genpdf(ans, texPath, tmpobj, iters)
  return ans
}

function normalizeUnixStyle(currentPath) {
  if (os.type() === 'Windows_NT') {
    return currentPath.replace(/\\/g, '/')
  }
  return currentPath
}

function templateParameter(parameter) {
  return `\${${parameter}}`
}

module.exports = function (_path, options) {
  options = options || {}
  options.output = options.output || './notebook.pdf'
  options.author = options.author || ''
  options.initials = options.initials || ''
  options.title = options.title || 'Team notebook'
  options.orientation = options.orientation || 'landscape'
  options.paper = options.paper || 'letterpaper'
  options.size = options.size || '10'
  options.columns = options.columns || '2'

  console.log(`[notebookgen] Starting notebook generation from: ${_path}`)
  console.log(`[notebookgen] Output will be written to: ${options.output}`)

  if (!options.size.endsWith('pt')) options.size += 'pt'
  if (options.image) {
    options.image = normalizeUnixStyle(path.resolve(options.image))
    options.image = '\\centering{\\includegraphics[width=3.5cm]{' + options.image + '}}'
  } else {
    options.image = ''
  }

  let multicolsBegin = ''
  let multicolsEnd = ''
  const columns = parseInt(options.columns) || 1
  if (columns > 1) {
    multicolsBegin = `\\begin{multicols}{${columns}}`
    multicolsEnd = '\\end{multicols}\n'
  }

  const tmpobj = tmp.dirSync({ unsafeCleanup: true })
  const texPath = path.join(tmpobj.name, '_notebook.tex')
  const texOutput = fs.createWriteStream(texPath, { encoding: 'utf8' })

  const files = collectFiles(_path)
  const total = files.length || 1
  let processed = 0
  const logEvery = Math.max(1, Math.floor(total / 20)) // ~5% steps
  function reportProgress () {
    processed += 1
    if (processed === total || processed % logEvery === 0) {
      const pct = Math.round((processed / total) * 100)
      console.log(`[notebookgen] processed ${processed}/${total} files (${pct}%)`)
    }
  }

  let template = fs.readFileSync(path.join(__dirname, 'template_header.tex')).toString()
  
  // Handle multicols: if single column, remove multicols environment entirely
  if (columns === 1) {
    // Remove \begin{multicols}{${columns}} and \end{multicols}
    template = template.replace(/\\begin\{multicols\}\{[^}]*\}\n?/g, '')
    template = template.replace(/\\end\{multicols\}\n?/g, '')
  }
  
  // Replace all template parameters (use global regex to replace all occurrences)
  const replacements = [
    [templateParameter('author'), options.author],
    [templateParameter('initials'), options.initials],
    [templateParameter('title'), options.title],
    [templateParameter('fontSize'), options.size],
    [templateParameter('multicolsBegin'), multicolsBegin],
    [templateParameter('columns'), columns.toString()],
    [templateParameter('paper'), options.paper],
    [templateParameter('orientation'), options.orientation],
    [templateParameter('image'), options.image]
  ]
  
  replacements.forEach(function ([param, value]) {
    const regex = new RegExp(param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    template = template.replace(regex, value)
  })

  texOutput.write(template)
  walkToStream(_path, 0, texOutput, reportProgress)
  texOutput.write(multicolsEnd)
  texOutput.end('\\end{document}')

  texOutput.on('error', function (err) {
    console.error('[notebookgen] Failed to write tex file', err)
  })

  texOutput.on('close', function () {
    console.log('[notebookgen] LaTeX source file written, starting PDF generation...')
    pdflatexFromPath(texPath, tmpobj).pipe(fs.createWriteStream(options.output))
  })
}
