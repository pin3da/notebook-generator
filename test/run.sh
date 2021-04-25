#!/bin/sh

npm ci
git clone https://github.com/pin3da/notebook
../bin/notebookgen ./notebook --author "Universidad Tecnologica de Pereira" --initials UTP -s 8 -c 3
