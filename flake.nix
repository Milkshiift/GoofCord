{
  description = "GoofCord Dev Flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        nodejs = pkgs.nodePackages_latest.nodejs;

        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };

        # This might be overkill
        electronLibs = with pkgs; [
          pkg-config
          gcc
          glibc
          stdenv.cc.cc.lib
          systemd

          gtk3
          glib
          gobject-introspection
          at-spi2-atk
          atkmm
          pango
          cairo
          gdk-pixbuf
          harfbuzz
          fontconfig
          freetype
          librsvg

          xorg.libX11
          xorg.libxcb
          xorg.libXcomposite
          xorg.libXdamage
          xorg.libXext
          xorg.libXfixes
          xorg.libXrandr
          xorg.libxkbfile
          xorg.libxshmfence

          libxkbcommon

          xorg.libXtst
          pipewire

          mesa
          libGL
          libdrm
          libgbm

          alsa-lib
          pulseaudio

          nss
          nspr
          openssl

          dbus
          expat
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          nativeBuildInputs = [
            nodejs
            pkgs.bun
            pkgs.fish
          ];

          buildInputs = electronLibs;

          LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath electronLibs;
          PKG_CONFIG_PATH = pkgs.lib.makeSearchPathOutput "dev" "lib/pkgconfig" electronLibs;

          shellHook = ''
            exec fish
          '';
        };
      }
    );
}