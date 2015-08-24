# notebook-generator
(Auto) generate notebooks from your source code. Useful for ACM-ICPC


## Dependencies
pdflatex

    [sudo] aptitude install texlive

## Install

    [sudo] npm install -g notebook-generator

## Use

    notebook-generator dir_codes <output_path>

example:

    notebook-generator ./ /tmp/team_reference.pdf
    notebook-generator ./

The second one will create a 'notebook.pdf' file in the current directory.

This is an example in pdf : https://github.com/pin3da/notebook-generator/blob/master/example-notebook.pdf

## Files

The notebook generator will add your source code with syntax highlight, additionally
you can add .tex files which will be rendered as latex code.

## Notes:

- Try to use up to 3 "levels" in your source code.
- Use spaces insead of underscore (in the filenames) to print a prettier TOC.
