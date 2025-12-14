FROM alpine:latest

# install libreoffice + dependencies
RUN apk add --no-cache libreoffice-writer python3 py3-pip openjdk11-jre-headless

# install unoserver via pip
RUN pip install unoserver --break-system-packages

CMD ["unoserver"]