; Coach Bot v3.0.0 Install Hook
; See docs/INSTALLER_RULES.md

!macro NSIS_HOOK_PREINSTALL
  ; Never overwrite existing DB
  ; Sandi's coaching data is sacred
  IfFileExists \
    "$APPDATA\com.sandibot.desktop\sandi_bot.db" \
    db_exists db_missing

  db_exists:
    Goto install_ready

  db_missing:
    Goto install_ready

  install_ready:
!macroend

!macro NSIS_HOOK_POSTINSTALL
  CreateDirectory \
    "$APPDATA\com.sandibot.desktop"
!macroend
