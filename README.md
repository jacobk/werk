# werk

CLI to create and manage pull requests with task lists on GitHub

## Demo

![WERK](http://jacobk.github.io/werk/images/demo02.gif)

## Install

`npm install -g werk`

## Usage

```
$ werk help
usage: werk [--no-cool-colors] [--no-cool-fonts] [--global] [--auth] <command>

Available werk commands are:
   add      add a task to the PR for this branch
   help     show werk help
   info     show info for current PR
   new      open a new PR
   open     open current PR in browser
   snap     take screenshot and add as comment
   todo     list all tasks from current PR

--global stores config values in global config intead of locally in current
         folder.
--auth   forces a re-auth with GitHub
```

## TODO

* werk team (who short status for all open PRs)
* werk comment (add comment to current PR)
* werk snap (comment with screenshot)
