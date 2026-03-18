fn main() {
    tauri_build::build();

    // Copy pdfium.dll to target dir for dev (pdfium-render loads from cwd/exe dir)
    let src = std::path::Path::new("pdfium.dll");
    if src.exists() {
        let out_dir = std::env::var("OUT_DIR").unwrap();
        // OUT_DIR is target/debug/build/pkg-hash/out; we need target/debug/
        let target_dir = std::path::Path::new(&out_dir)
            .ancestors()
            .nth(3)
            .unwrap_or_else(|| std::path::Path::new(&out_dir));
        let dest = target_dir.join("pdfium.dll");
        let _ = std::fs::copy(src, dest);
    }
}
