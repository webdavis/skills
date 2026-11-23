---
name: depgraph
description: >-
  Draw a dependency diagram of the repository you are in, as a picture: modules and the links
  between them, the files inside chosen modules, the functions and types inside those files, only
  the code changed on the current branch, or the code behind a feature you describe. Arguments:
  `[description] [--modules [name ...]] [--changed[=<ref>]] [--symbols]
  [--output <file.svg|file.png>]`. It shows the picture in the session and writes a file only when
  `--output` names one.
disable-model-invocation: true
argument-hint: "[description] [--modules [name ...]] [--changed[=<ref>]] [--symbols] [--output <file.svg|file.png>]"
compatibility: Requires the d2 program on PATH, and git for --changed.
---

# depgraph

Draw a dependency diagram of the repository in the current directory, in one fixed visual style,
and show it to the user.

The user decides what happens to the picture. Show it in the session and stop there. Write into the
repository only at the path `--output` names. Never add the picture to a README or any other
document, never commit, and never suggest doing either unless asked.

## Arguments

The arguments are whatever followed the skill name in the request. Read them with these rules, so
that a plain word is never taken for the wrong thing:

| Part | Rule |
| --- | --- |
| Description | Every word before the first flag, taken together as free text. |
| `--modules` | Takes the names that follow it, up to the next flag. No names means every module. |
| `--changed` | Alone, compares against the default branch. A starting point is attached with `=`, as in `--changed=HEAD~3`. |
| `--symbols` | Takes nothing. Valid only with `--modules`, `--changed` or a description. |
| `--output` | Takes one path ending in `.svg` or `.png`. |

Stop and say what is wrong, drawing nothing, when:

- `--symbols` is given with none of `--modules`, `--changed` or a description. Tell the user to add
  `--modules`.
- `--output` names a file that is not `.svg` or `.png`.
- a name after `--modules` matches no module. List the modules that exist.
- a description and `--changed` are both given. They are two different scopes; ask for one.

## What each request draws

| Request | Boxes | Links |
| --- | --- | --- |
| no scope | One box per module | Module to module |
| `--modules` | Every module as a group, with one box per source file inside | File to file |
| `--modules a b` | Only the named modules, opened the same way. A file outside them that a shown file depends on, or that depends on a shown file, is left out. | File to file |
| `--changed` | The changed files, plus their direct neighbours, grouped by module | File to file |
| description | The files that implement what was described, plus their direct neighbours, grouped by module | File to file |
| any of the last four with `--symbols` | Each file becomes a group holding one box per top-level declaration in it | See "Symbols" |

`--modules` narrows `--changed` or a description to the named modules.

A direct neighbour is a file one step away: something the chosen code depends on, or something that
depends on it. Neighbours give the chosen code its context. Go one step only, because a second step
pulls in most of the codebase and buries what was asked for. For the same reason, draw no link
between two neighbours: every link drawn has chosen code on at least one end.

## Find the modules and links

A module is a unit the build declares: a Cargo workspace member, a Swift package target, an npm
workspace package, a Go package, a Python package. Production code that no build file covers, such
as scripts in a second language beside the main build, forms extra modules: one per top-level folder
that holds such code, named by its path from the repository root, as in `lua/pwe`. Where the build
declares no module, or only one, use the top-level source folders as the modules. Name a declared
module by the name its build file gives it.

Read the code for the links; do not guess them from names.

1. List the modules.
2. List each module's source files. Leave out tests, fixtures, generated code, vendored code and
   developer tooling such as build or lint scripts, because they hide the shape of the production
   code. Leave them out as neighbours too.
3. Collect what each file depends on: import, `use`, `mod`, `include` and `require` lines, lines
   that embed another file such as `include_str!`, and the dependencies the build files declare
   between modules.
4. Follow a re-export to the file that declares the item. When `list.rs` imports `Agent` through a
   crate root or index file that only re-exports it, the link goes to the file that declares
   `Agent`. Draw the re-exporting file only when it declares something of its own or is itself in
   scope, and then link it to the files it declares as submodules. Without this rule every import
   through a crate root points at the root and draws cycles that are not in the code.
5. In languages where files of one module see each other without an import, such as Swift, a link
   is not written down. Find it by listing the types each file declares and searching the other
   files for their use. Treat every link found this way as inferred. Code that receives another
   file's functions as arguments, or loads a file by a name held in a string, is inferred too.
6. Draw no link for one program running another as a process, such as a script calling the built
   binary. Mention it in the reply if it matters to the scope asked for.
7. Keep only links between files of this repository. Leave out the standard library and third-party
   packages.
8. For the module view, a module depends on another when any of its files does.

Draw each link once, pointing from the code that depends to the code it depends on. Give inferred
links the `inferred` class as well, so they look different from links read from the code.

## Changed code

For `--changed`, git is the source of truth, because it is exact and does not rely on memory of
the session.

1. Run the script beside this file, passing the ref from `--changed=<ref>` when one was given:
   `<this skill's folder>/scripts/changed-files.sh [<ref>]`. It picks the remote's default branch
   when no ref is given, compares from the point where the current branch left it, and includes
   uncommitted edits and new files. Use its output as it is; do not work out the starting point
   yourself, because the local default branch can be ahead of the remote and hide committed work.
2. Its first two lines are `start <ref>` and `base <commit>`. Each line after that is a git status
   letter and a path: `A` added, `M` modified, `D` deleted, `R<score>` renamed with old and new path.
3. Keep source files only. Ignore documents, configuration and tests.
4. If the script fails, or nothing is left, say so and draw nothing.

Mark each changed box by starting its label with `+ ` for added, `~ ` for modified and `- ` for
removed. Give removed boxes the `removed` class as well. A renamed file is one modified box under
its new name. For a removed file, read its old content with `git show <merge-base>:<path>` to find
what it depended on, and search the current code for anything that still refers to it.

Give neighbour boxes the `neighbour` class, which dims them.

## Described code

A description such as "the agent listing feature" has no exact boundary in code, so choosing the
files is a judgement. Search for the names, commands and types the description points at, follow
them to the files that implement them, and stop at the edge of the feature. Mark the chosen files
with no prefix, and give their direct neighbours the `neighbour` class.

Always list the files you chose in the reply, so the user can see when the judgement was wrong.

## Symbols

With `--symbols`, each file is drawn as a group, and inside it one box for each top-level
declaration: every function, type, interface and enum the file declares, including private ones.
Leave out declarations that exist only for tests.

| Kind | What it covers | Label |
| --- | --- | --- |
| `interface` | trait, protocol, interface, abstract base class | `«interface» Name`, a blank line, then one line per method: `name(params) → ReturnType` |
| `type` | struct, class, actor, record, type alias | `Name` |
| `enum` | enum, union of cases | `«enum» Name` |
| `function` | free function | `name()` |

Any other top-level declaration, such as a constant, uses `type` with its kind in front:
`«const» NAME`. Methods belong to their type or interface and get no box of their own; the receiver
parameter, such as `&self` or `self`, is left out of a method label. A file that declares nothing of
its own is drawn as a single `file` box, not an empty group.

Links between files stay. Where the code names the exact declaration on each end, attach the link
to those declaration boxes instead of the file groups. Where only the target is named, as with a
file-level import, start the link from the file group. Use the `implements` class for a type that
implements an interface or extends a base. Draw no links between declarations of the same file:
the picture is about how files depend on each other, and links inside a file crowd it.

With `--changed`, put the `+ `, `~ ` or `- ` prefix on the declarations that changed, and on the
file group.

## Write the diagram

Create a working folder outside the repository with `mktemp -d`, and write `diagram.d2` in it.

Start the file with these two lines. The first pulls in the shared style; everything visual comes
from its classes, so set no colours, fonts or shapes yourself.

```d2
...@style
direction: down
```

Then write groups, boxes and links using only these classes:

| Class | Use for |
| --- | --- |
| `module-group` | A module drawn as a group around its contents |
| `file-group` | A file drawn as a group around its declarations |
| `module` | A module drawn as a single box |
| `file` | A file drawn as a single box |
| `interface`, `type`, `enum`, `function` | A declaration box |
| `neighbour` | Added to a box that is only context |
| `removed` | Added to a box for removed code |
| `from-module`, `from-file`, `from-interface`, `from-type`, `from-enum`, `from-function` | A link, named for the kind of box it starts from. A link that starts from a group uses that group's kind: `from-file` or `from-module`. |
| `implements` | Added to a link that means "implements" or "extends" |
| `inferred` | Added to a link found by inference rather than read from the code |

Rules that keep the file valid:

- Give every box and group an id made of a short prefix and a number, such as `m1`, `f3`, `s12`,
  and put the real name in the label. Real names collide with words D2 reserves, such as `near`,
  `label`, `style` and `class`, and names with dots or dashes break paths.
- Put every label in double quotes. Write a line break inside a label as `\n`.
- Apply two classes with a list: `class: [type; neighbour]`.
- Refer to a box inside a group by its path: `m1.f3`, or `m1.f3.s12`.

Example, for two modules with one file opened to its declarations:

```d2
...@style
direction: down
m1: "pwe" {
  class: module-group
  f1: "main.rs" {class: file}
  f2: "rex_config.rs" {
    class: file-group
    s1: "«interface» RexConfig\n\nloader(pwe) → String\nconfig() → String" {class: interface}
    s2: "EmbeddedRexConfig" {class: type}
  }
}
m2: "agent" {
  class: module-group
  f3: "~ list.rs" {class: file}
  f4: "agent.rs" {class: [file; neighbour]}
}
m1.f1 -> m1.f2.s2: {class: from-file}
m1.f1 -> m2.f3: {class: from-file}
m2.f3 -> m2.f4: {class: from-file}
```

## Draw and show it

The picture is drawn by the script beside this file, which supplies `style.d2` and holds the layout
and style settings:

```sh
<this skill's folder>/scripts/render.sh <working folder>/diagram.d2 <working folder>/depgraph.png
```

- If the script says `d2` is not installed, pass that message on and stop. Do not draw the diagram
  another way, because the result would not match the style the user expects.
- If `d2` reports an error in `diagram.d2`, fix the file and run the script again.
- Show `depgraph.png` in the session: embed it as a Markdown image, `![depgraph](<path>)`, or use
  whatever else your harness offers for displaying an image file. Print its path in every case,
  because some terminals cannot show pictures.
- With `--output`, run the script a second time with that path as the picture. Create the parent
  folder if it is missing. An existing file at that path is replaced, since the user named it.

If the diagram would have more than 50 boxes, groups not counted, do not draw it. A picture that
size cannot be read. Report the count and suggest a narrower request: named modules, no
`--symbols`, or a smaller change range.

## Reply

Keep the reply short. After the picture and its path, state:

- what the boxes are and what scope was drawn, in one line;
- a key covering only what appears in this picture, taken from: purple interface, blue type or
  file, green enum, orange function, grey outline module, dashed grey frame module group, dimmed
  for context only, `+` added, `~` modified, `-` removed, long-dashed arrow with a hollow head for
  "implements", short-dashed arrow for inferred;
- every link that was inferred rather than read from an import or build file, or "none";
- for a description, the files chosen;
- for `--changed`, the starting point used.
