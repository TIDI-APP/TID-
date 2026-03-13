#!/bin/sh

if [ "$GIT_AUTHOR_EMAIL" = "mackbookpro@MacBook-Pro-de-Santiago.local" ]
then
    GIT_AUTHOR_NAME="Equipo"
    GIT_AUTHOR_EMAIL="cdbt3980@gmail.com"
fi

if [ "$GIT_COMMITTER_EMAIL" = "mackbookpro@MacBook-Pro-de-Santiago.local" ]
then
    GIT_COMMITTER_NAME="Equipo"
    GIT_COMMITTER_EMAIL="cdbt3980@gmail.com"
fi

export GIT_AUTHOR_NAME
export GIT_AUTHOR_EMAIL
export GIT_COMMITTER_NAME
export GIT_COMMITTER_EMAIL