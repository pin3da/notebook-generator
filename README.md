# notebook-generator
(Auto) generate notebooks from your source code. Useful for ACM-ICPC


## Dependencies
pdflatex

    [sudo] aptitude install texlive

## Install

    [sudo] npm install -g notebook-generator

## Use

    Usage: notebookgen <soruce_dir> [options]

    Auto generate notebooks from your source code

    Options:

        -V, --version             output the version number
        -a --author [name]        author's name to be added in the notebook
        -i --initials [initials]  initials of the author to be placed in the upper-right corner of all pages
        -o --output [filename]    output file for the notebook. Default to `./notebook.pdf`
        -h, --help                output usage information


example:

    notebook-generator ./ /tmp/team_reference.pdf
    notebook-generator ./ --author "Universidad Tecnologica de Pereira" --initials UTP

The second one will create a 'notebook.pdf' file in the current directory.

This is output example : https://github.com/pin3da/notebook-generator/blob/master/example-notebook.pdf

## Files

The notebook generator will add your source code with syntax highlight, additionally
you can add .tex files which will be rendered as latex code.

## Notes:

- Try to use up to 3 "levels" in your source code.
- Use spaces insead of underscore (in the filenames) to print a prettier TOC.

----
[Manuel Pineda](https://github.com/pin3da/)