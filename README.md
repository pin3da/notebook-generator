# notebook-generator

[![Build Status](https://travis-ci.org/pin3da/notebook-generator.svg?branch=master)](https://travis-ci.org/pin3da/notebook-generator)

(Auto) generate notebooks from your source code. Useful for ACM-ICPC

## Dependencies

This generator works in both Linux and Windows, so check how to install texlive in your OS.

texlive for Linux:

    aptitude install texlive

texlive for Windows:

    download installer (install-tl-Windows.exe) from https://www.tug.org/texlive/acquire-netinstall.html

## Install

    npm install -g notebook-generator

## Use

    Usage: notebook-generator <source_dir> [options]

    Auto generate notebooks from your source code

    Options:
        -V, --version             output the version number
        -a --author <name>        author's name to be added in the notebook
        -i --initials <initials>  initials of the author to be placed in the upper-right corner of all pages
        -o --output <filename>    output file for the notebook. (default: "./notebook.pdf")
        -s --size <size>          font size is allowed 8, 9, 10, 11, 12, 14, 17, 20 pt (default: "10")
        -c --columns <amount>     number of columns is allowed 2, 3. (default: "2")
        -p --paper <size>         paper size is allowed letterpaper, a4paper, a5paper. (default: "letterpaper")
        -h, --help                output usage information
        -I --image <source>       cover image to be added in the notebook.


example:

    notebook-generator ./ --output /tmp/team_reference.pdf
    notebook-generator ./ --author "Universidad Tecnologica de Pereira" --initials UTP --size 12 --columns 3 --paper a4paper --image ./in-silicon

The second one will create a 'notebook.pdf' file in the current directory.

## Example PDF

Here you can find an example https://github.com/pin3da/Programming-contest/blob/master/codes/notebook.pdf

## Files

The notebook generator will add your source code with syntax highlight, additionally
you can add .tex files which will be rendered as latex code.

## Notes:

- Try to use up to 3 "levels" in your source code.
- Use spaces insead of underscore (in the filenames) to print a prettier TOC.

----
[Manuel Pineda](https://github.com/pin3da/) & [Diego Restrepo](https://github.com/Diegores14)
