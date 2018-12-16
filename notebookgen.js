const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const through2 = require('through2')
const tmp = require('tmp')

const section = ['\\section{', '\\subsection{', '\\subsubsection{']
const extensions = ['.cc', '.cpp', '.c', '.java', '.py', '.tex']

function walk (_path, depth) {
  let ans = ''
  depth = Math.min(depth, section.length - 1)
  fs.readdirSync(_path).forEach(function (file) {
    if (file.startsWith('.')) {
      return // hidden directory
    }
    let f = path.resolve(_path, file)
    let stat = fs.lstatSync(f)
    if (stat.isDirectory()) {
      ans += '\n' + section[depth] + file + '}\n' + walk(f, depth + 1)
    } else if (extensions.indexOf(path.extname(f)) !== -1) {
      ans += '\n' + section[depth] + file.split('.')[0] + '}\n'
      if (path.extname(f) !== '.tex') {
        ans += '\\begin{lstlisting}\n' + fs.readFileSync(f) + '\\end{lstlisting}\n'
      } else {
        ans += fs.readFileSync(f)
      }
    }
  })
  return ans
}

/**
 * pdf must be generated twice in order to generate the table of contents.
 * According to some tests, in windows it must be generated 3 times.
 * */
function genpdf (ans, texPath, tmpobj, iter) {
  let tex = spawn('pdflatex', [
    '-interaction=nonstopmode',
    texPath
  ], {
    cwd: tmpobj.name,
    env: process.env
  })

  tex.on('error', function (err) {
    console.error(err)
  })

  tex.on('exit', function (code, signal) {
    let outputFile = texPath.split('.')[0] + '.pdf'
    fs.access(outputFile, function (err) {
      if (err) {
        return console.error('Not generated ' + code + ' : ' + signal)
      }
      if (iter === 0) {
        let s = fs.createReadStream(outputFile)
        s.pipe(ans)
        s.on('close', function () {
          tmpobj.removeCallback()
        })
      } else {
        genpdf(ans, texPath, tmpobj, iter - 1)
      }
    })
  })
}

function pdflatex (doc) {
  let tmpobj = tmp.dirSync({ unsafeCleanup: true })
  let texPath = path.join(tmpobj.name, '_notebook.tex')

  let ans = through2()
  ans.readable = true
  let input = fs.createWriteStream(texPath)
  input.end(doc)
  input.on('close', function () {
    let iters = process.platform === 'win32' ? 2 : 1
    genpdf(ans, texPath, tmpobj, iters)
  })

  return ans
}

module.exports = function (_path, output, author, initials, FontSize) {
  let template = fs.readFileSync(path.join(__dirname, 'template_header.tex')).toString()
  template = template
    .replace(`\${author}`, author)
    .replace(`\${initials}`, initials)
    .replace(`\${FontSize}`, FontSize)

  template += walk(_path, 0)
  template += '\\end{document}'
  output = output || './notebook.pdf'
  pdflatex(template).pipe(fs.createWriteStream(output))
}
