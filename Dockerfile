FROM alpine:latest

# install fonts https://wiki.alpinelinux.org/wiki/Fonts
RUN apk add --no-cache font-terminus font-inconsolata font-dejavu font-noto font-noto-cjk font-awesome font-noto-extra

# install libreoffice + dependencies
RUN apk add --no-cache libreoffice-writer python3 py3-pip openjdk11-jre-headless

# install unoserver via pip
RUN pip install unoserver --break-system-packages

CMD ["unoserver", "--interface", "0.0.0.0"]