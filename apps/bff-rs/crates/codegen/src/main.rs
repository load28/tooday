//! `contract-codegen` — emit the contract as valibot TypeScript.
//!
//! Usage:
//!   contract-codegen --out <dir>     write generated .ts files
//!   contract-codegen --out <dir> --check   fail (exit 1) if files are stale

use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    let mut out: Option<PathBuf> = None;
    let mut check = false;

    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--out" | "-o" => out = args.next().map(PathBuf::from),
            "--check" => check = true,
            "-h" | "--help" => {
                eprintln!("usage: contract-codegen --out <dir> [--check]");
                return ExitCode::SUCCESS;
            }
            other => {
                eprintln!("unknown argument: {other}");
                return ExitCode::from(2);
            }
        }
    }

    let Some(out) = out else {
        eprintln!("error: --out <dir> is required");
        return ExitCode::from(2);
    };

    let reg = contract::registry();
    let files = contract::emit::emit_all(&reg);

    if check {
        let mut stale = Vec::new();
        for (name, contents) in &files {
            let path = out.join(name);
            match std::fs::read_to_string(&path) {
                Ok(existing) if &existing == contents => {}
                Ok(_) => stale.push(format!("  drift: {}", path.display())),
                Err(_) => stale.push(format!("  missing: {}", path.display())),
            }
        }
        if stale.is_empty() {
            println!("contract-codegen: {} file(s) up to date", files.len());
            ExitCode::SUCCESS
        } else {
            eprintln!("contract-codegen: generated TypeScript is stale:");
            for line in &stale {
                eprintln!("{line}");
            }
            eprintln!("\nrun `bun run codegen:contracts` and commit the result.");
            ExitCode::FAILURE
        }
    } else {
        if let Err(e) = std::fs::create_dir_all(&out) {
            eprintln!("error: cannot create {}: {e}", out.display());
            return ExitCode::FAILURE;
        }
        for (name, contents) in &files {
            let path = out.join(name);
            if let Err(e) = std::fs::write(&path, contents) {
                eprintln!("error: cannot write {}: {e}", path.display());
                return ExitCode::FAILURE;
            }
            println!("wrote {}", path.display());
        }
        ExitCode::SUCCESS
    }
}
