use std::path::Path;
use cleanscope_lib::knowledge::KnowledgeBase;
use cleanscope_lib::models::{CategoryType, RiskLevel};
use cleanscope_lib::safety::SafetyEngine;

#[test]
fn test_protected_windows_system_paths() {
    let engine = SafetyEngine::new(vec![]);

    let (prot1, _) = engine.is_protected_path(Path::new(r"C:\Windows\System32\kernel32.dll"));
    assert!(prot1, "System32 must be protected");

    let (prot2, _) = engine.is_protected_path(Path::new(r"C:\Windows\SysWOW64\cmd.exe"));
    assert!(prot2, "SysWOW64 must be protected");

    let (prot3, _) = engine.is_protected_path(Path::new(r"C:\$Recycle.Bin\S-1-5-21"));
    assert!(prot3, "Recycle Bin system directory must be protected");

    let (prot4, _) = engine.is_protected_path(Path::new(r"C:\pagefile.sys"));
    assert!(prot4, "pagefile.sys must be protected");

    let (prot5, _) = engine.is_protected_path(Path::new(r"C:\Users\test\AppData\Roaming\Microsoft\Crypto\RSA"));
    assert!(prot5, "Crypto store must be protected");
}

#[test]
fn test_custom_protected_paths() {
    let engine = SafetyEngine::new(vec![r"D:\ImportantData".to_string()]);

    let (prot, reason) = engine.is_protected_path(Path::new(r"D:\ImportantData\project\file.txt"));
    assert!(prot);
    assert_eq!(reason, "Custom user-defined protected path");

    let (not_prot, _) = engine.is_protected_path(Path::new(r"D:\OtherData\cache.tmp"));
    assert!(!not_prot);
}

#[test]
fn test_disposable_cache_matching() {
    let kb = KnowledgeBase::new();

    let chrome_match = kb.match_candidate(
        r"c:\users\user\appdata\local\google\chrome\user data\default\cache\data_0",
        Some("data_0"),
        false,
    );
    assert!(chrome_match.is_some());
    let m = chrome_match.unwrap();
    assert_eq!(m.category, CategoryType::Cache);
    assert_eq!(m.risk_level, RiskLevel::Safe);
    assert!(m.can_regenerate);

    let npm_match = kb.match_candidate(
        r"c:\users\user\appdata\local\npm-cache\_cacache\index-v5",
        None,
        true,
    );
    assert!(npm_match.is_some());
    let n = npm_match.unwrap();
    assert_eq!(n.category, CategoryType::DeveloperCache);
    assert_eq!(n.risk_level, RiskLevel::Review);

    let py_match = kb.match_candidate(
        r"c:\projects\my_app\__pycache__\main.cpython-312.pyc",
        Some("pyc"),
        false,
    );
    assert!(py_match.is_some());
    let p = py_match.unwrap();
    assert_eq!(p.category, CategoryType::BuildOutput);
    assert_eq!(p.risk_level, RiskLevel::Safe);
}

#[test]
fn test_pre_cleanup_validation() {
    let engine = SafetyEngine::new(vec![]);

    // Protected path should fail validation
    let res = engine.validate_candidate_for_cleanup(Path::new(r"C:\Windows\System32"));
    assert!(res.is_err());
}
