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

## Configuration

By default werk will create a `.werk` configuration file in current working directory. By providing the `--global` flag the configuration file will be created in the user home directory instead (if there's not already one in the current directory).

Configuration files local to the current directory have precedence of the configuration file in the user home.

The following options and their default values are:

```javascript
{
  // Indicate which branch work should be based of
  "default_branch": "master",
  
  // Use unicode for task lists
  "cool_fonts": true,
  
  // Colorize output
  "cool_colors": true,
  "verbose": false,
  
  // Github authentication info (no default values)
  // werk will prompt for github auth if not present in config
  "github_user": "jacobk",
  "github_token": "264b696ab26a7a0c75441f9db991d4b53c9d19c4"
}
```

## GitHub Authentication

### Authenticating using werk

werk will prompt for username/password if no github info is found in either the current directory `.werk` file or a `.werk` file in the user home directory.

werk will create a personal access token using the *repo* scope. After successful authentication with GitHub you will find a personal access token created here: https://github.com/settings/applications#personal-access-tokens

It should look something like this

![Personal Access Token](http://jacobk.github.io/werk/images/werk_personal_access_token.png)


### Manual token creation

If you don't trust werk with your secrets you can create a personal access token manualy by clicking the "Generate new token" button in your [application settings](https://github.com/settings/applications#personal-access-tokens)

Manually copy the config example above and create a `.werk` file if not already present and provide your GitHub username and the token created.

The token is the hexstring on green background.

![Personal Access Token](http://jacobk.github.io/werk/images/generated_personal_access_token.png)


## TODO

* werk team (who short status for all open PRs)
* werk comment (add comment to current PR)
* werk snap (comment with screenshot)
