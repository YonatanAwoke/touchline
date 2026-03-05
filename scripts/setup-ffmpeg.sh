#!/bin/bash
set -e

# Directory for binaries
BIN_DIR="apps/backend/bin"
TEMP_DIR="temp_ffmpeg"

echo "Downloading FFmpeg static build..."
mkdir -p $BIN_DIR
mkdir -p $TEMP_DIR

# Download static build
curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o $TEMP_DIR/ffmpeg.tar.xz

# Extract
echo "Extracting..."
tar -xf $TEMP_DIR/ffmpeg.tar.xz -C $TEMP_DIR --strip-components=1

# Move binaries
echo "Installing to $BIN_DIR..."
mv $TEMP_DIR/ffmpeg $BIN_DIR/
mv $TEMP_DIR/ffprobe $BIN_DIR/

# Cleanup
rm -rf $TEMP_DIR

# Verify
echo "Done! Verifying installation:"
$BIN_DIR/ffmpeg -version | head -n 1
$BIN_DIR/ffprobe -version | head -n 1
