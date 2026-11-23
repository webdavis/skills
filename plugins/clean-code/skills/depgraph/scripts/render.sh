#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: render.sh <diagram.d2> <picture.svg|picture.png>" >&2
  exit 2
fi

diagram=$1
picture=$2

case $picture in
  *.svg | *.png) ;;
  *)
    echo "depgraph writes .svg or .png pictures, not: $picture" >&2
    exit 2
    ;;
esac

if ! command -v d2 >/dev/null 2>&1; then
  echo "depgraph needs the d2 program, which is not installed: brew install d2, or see https://d2lang.com" >&2
  exit 127
fi

skill_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cp "$diagram" "$work/diagram.d2"
cp "$skill_dir/assets/style.d2" "$work/style.d2"

d2 --layout elk --sketch --theme 200 \
  --elk-nodeNodeBetweenLayers 90 \
  --elk-edgeNodeBetweenLayers 50 \
  --elk-padding "[top=60,left=60,bottom=60,right=60]" \
  "$work/diagram.d2" "$picture"
