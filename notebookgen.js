const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn
const through2 = require('through2')
const tmp = require('tmp')
const os = require('os')




"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
function repl(filePath) {
    const data = fs_1.default.readFileSync(filePath);
    const _text = data.toString('utf-8');
    const text = _text
        .replace(/({verbatim})/g,'{lstlisting}')
  .replace(/\\subsubsection{([^}]*.)}\\label{[^}]*.}/g, '$1')
        .replace(/(\\subsection)/g, '\\subsubsection')
        .replace(/(\\section)/g, '\\subsection');
    if (text !== _text) {
        fs_1.default.writeFileSync(filePath, text);
        return 0;
    }
    return 1;
}

function repe(filePath) {
    const data = fs_1.default.readFileSync(filePath);
    const _text = data.toString('utf-8');
    const text = _text.replace(/(```)[a-zA-Z]{1,}/g,'```').replace(/!\[.*\.png\)/g,'');
    if (text !== _text) {
        fs_1.default.writeFileSync(filePath, text);
        return 0;
    }
    return 1;
}


function renam(str)
{
  let tem='';
  for (var i = 0; i < str.length; i++) {
    if(str[i]!=='_')tem+=str[i];
    else tem+=' ';
  }
  return tem;
}

function sleep(miliseconds) {
   var currentTime = new Date().getTime();

   while (currentTime + miliseconds >= new Date().getTime()) {
   }
}




const section = ['\\section{', '\\subsection{', '\\subsubsection{']
const extensions = {
  '.cc': 'C++',
  '.cpp': 'C++',
  '.c': 'C',
  '.java': 'Java',
  '.py': 'Python',
  '.tex': 'Tex',
  '.go': 'Golang'
}

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
      ans += '\n' + section[depth] + renam(file) + '}\n' + walk(f, depth + 1)
    } else if (path.extname(f) in extensions) {
      if (path.extname(f) !== '.tex') {
        ans += '\n' + section[depth] + renam(file.split('.')[0]) + '}\n'
        ans += `\\begin{lstlisting}[language=${extensions[path.extname(f)]}]\n` + fs.readFileSync(f) + '\\end{lstlisting}\n'
      } else {
        repe(f);
        if(repl(f))
        {
          ans += '\n' + section[depth] + renam(file.split('.')[0]) + '}\n'
        }
        ans += fs.readFileSync(f)
      }
    }
    else if(path.extname(f)=='.md'){
      repe(f);
      var exec = require('child_process').exec;
      var cmd = 'pandoc '+f+' -o '+path.parse(f).name+'.tex';
      exec(cmd, function(error, stdout, stderr) {});
      sleep(100);
      f=path.parse(f).name+'.tex';
      if(repl(f))
      {
        ans += '\n' + section[depth] + renam(file.split('.')[0]) + '}\n'
      }
      ans += fs.readFileSync(f)
      cmd = 'rm '+f;
      exec(cmd, function(error, stdout, stderr) {});
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

function normalizeUnixStyle (currentPath) {
  if (os.type() === 'Windows_NT') {
    return currentPath.replace(/\\/g, '/')
  }
  return currentPath
}

module.exports = function (_path, options) {
  options.output = options.output || './notebook.pdf'
  options.author = options.author || ''
  options.initials = options.initials || ''

  if (!options.size.endsWith('pt')) options.size += 'pt'
  if (options.image) {
    options.image = normalizeUnixStyle(path.resolve(options.image))
    options.image = '\\centering{\\includegraphics[width=3.5cm]{' + options.image + '}}'
  } else {
    options.image = ''
  }

  let template = fs.readFileSync(path.join(__dirname, 'template_header.tex')).toString()
  template = template
    .replace(`\${author}`, options.author)
    .replace(`\${initials}`, options.initials)
    .replace(`\${fontSize}`, options.size)
    .replace(`\${columns}`, options.columns)
    .replace(`\${paper}`, options.paper)
    .replace(`\${image}`, options.image)

  template += walk(_path, 0)
  template += '\\end{multicols}\n'
  template += '\\end{document}'
  // fs_1.default.writeFileSync('./notebook.tex', template);
  pdflatex(template).pipe(fs.createWriteStream(options.output))
}
