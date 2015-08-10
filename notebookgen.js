var fs       = require('fs'),
    path     = require('path'),
    spawn    = require('child_process').spawn,
    through2 = require('through2');


var section = ['\\section{', '\\subsection{', '\\subsubsection{'];
var extensions = ['.cc', '.cpp', '.c', '.java', '.py'];

function walk(_path, depth) {
  var ans = "";
  depth = Math.min(depth, section.length - 1);
  fs.readdirSync(_path).forEach(function (file) {
    var f = path.resolve(_path, file);
    var stat = fs.lstatSync(f);
    if (stat.isDirectory())
      ans += '\n' + section[depth] + file + '}\n' + walk(f, depth + 1);
    else if (extensions.indexOf(path.extname(f)) != -1) {
      ans += '\n' + section[depth] + file.split('.')[0] + '}\n';
      ans +=  '\\begin{lstlisting}\n' + fs.readFileSync(f) + '\\end{lstlisting}\n';
    }
  });
  return ans;
}


/**
 * pdf must be generated twice in order to generate the table of contents.
 * */
function genpdf(ans, tex_path, iter) {
  var tex = spawn('pdflatex', [
      '-interaction=nonstopmode',
      tex_path
  ], {
    cwd: '/tmp',
    env: process.env
  });

  tex.on('error', function(err) {
    console.error(err);
  });

  tex.on('exit', function(code, signal) {
    var output_file = tex_path.split('.')[0] + '.pdf';
    fs.exists(output_file, function(exists) {
      if (exists) {
        if (iter == 1) {
          var s = fs.createReadStream(output_file);
          s.pipe(ans);
        } else {
          genpdf(ans, tex_path, iter + 1);
        }
      } else {
        console.error('Not generated ' + code + ' : ' + signal);
      }
    });
  });
}

function pdflatex(doc, iter) {
  var tex_path = '/tmp/_notebook.tex';

  var ans   = through2();
  ans.readable = true;
  var input = fs.createWriteStream(tex_path);
  input.end(doc);
  input.on('close', function() {
    genpdf(ans, tex_path, 0)
  });

  return ans;
}

module.exports =  function(path, output) {
  var template = fs.readFileSync(__dirname + '/template_header.tex').toString();
  template += walk(path, 0);
  template += '\\end{document}';
  output = output || './notebook.pdf';
  pdflatex(template).pipe(fs.createWriteStream(output));
}
