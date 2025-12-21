FROM ubuntu:24.04

RUN apt-get update && apt-get install -y libreoffice-writer --no-install-recommends
