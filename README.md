# jupyterlab-search-replace

[![Extension status](https://img.shields.io/badge/status-ready-success 'ready to be used')](https://jupyterlab-contrib.github.io/) [![Build](https://github.com/jupyterlab-contrib/search-replace/actions/workflows/build.yml/badge.svg)](https://github.com/jupyterlab-contrib/search-replace/actions/workflows/build.yml) [![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab-contrib/search-replace/main?urlpath=lab) [![Version](https://img.shields.io/pypi/v/jupyterlab-search-replace.svg)](https://pypi.org/project/jupyterlab-search-replace/) [![Version](https://img.shields.io/conda/vn/conda-forge/jupyterlab-search-replace.svg)](https://anaconda.org/conda-forge/jupyterlab-search-replace)

Search and replace across files.

![JupyterLab demo](https://raw.githubusercontent.com/jupyterlab-contrib/search-replace/main/search-replace-demo.gif)

> JupyterLab integration

![Notebook demo](https://raw.githubusercontent.com/jupyterlab-contrib/search-replace/main/search_in_notebook.png)

> Notebook integration

**Notes on replace**

There are three levels of replacement. Undo capability is possible except for replace all matches:

- Replace all matches: _Cannot_ be undone. A dialog will ask confirmation and all files will be backed up
  in `.ipynb_checkpoints` folders before applying the replacement actions.
- Replace all matches in a file: The file will be opened in the text editor and the replacement will be done
  as a single text edition. So all replacements can will be undone by calling the editor undo action.
- Replace a single match: The file will be opened in the text editor and the replacement will be done as
  a text edition. The replacement will be undone by calling the editor undo action.

## Requirements

- JupyterLab >= 3.0 and Notebook >= 7.0
- [ripgrep](https://github.com/BurntSushi/ripgrep)

> _ripgrep_ is available as [conda package](https://anaconda.org/conda-forge/ripgrep) on conda-forge.

## Install

To install the extension, execute:

```bash
pip install jupyterlab jupyterlab-search-replace
```

Note: You still need `ripgrep` installed for `jupyterlab-search-replace` to work.

or

```bash
conda install -c conda-forge jupyterlab-search-replace ripgrep
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab-search-replace
```

or

```bash
conda remove jupyterlab-search-replace ripgrep
```

## Troubleshoot

If you are seeing the frontend extension, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you are not seeing
the frontend extension, check the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyterlab_search_replace directory
# Install package in development mode
pip install -e ".[test]"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyterlab_search_replace
# Rebuild extension Typescript source after making changes
jlpm run build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm run watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm run build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable jupyterlab_search_replace
pip uninstall jupyterlab_search_replace
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyterlab-search-replace` within that folder.

### Testing the extension

#### Server tests

This extension is using [Pytest](https://docs.pytest.org/) for Python code testing.

Install test dependencies (needed only once):

```sh
pip install -e ".[test]"
# Each time you install the Python package, you need to restore the front-end extension link
jupyter labextension develop . --overwrite
```

To execute them, run:

```sh
pytest -vv -r ap --cov jupyterlab_search_replace
```

#### Integration tests

This extension uses [Playwright](https://playwright.dev/docs/intro) for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/main/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)
