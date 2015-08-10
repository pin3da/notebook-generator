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


## Notes:

- Try to use up to 3 "levels" in your source code.
- Use spaces insead of underscore (in the filenames) to print a prettier TOC.
