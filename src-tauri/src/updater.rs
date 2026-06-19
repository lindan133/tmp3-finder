use serde::Serialize;

const GITHUB_REPO: &str = "lindan133/tmp3-finder";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub release_url: String,
    pub release_notes: Option<String>,
}

fn parse_version(value: &str) -> Option<(u32, u32, u32)> {
    let trimmed = value.trim().trim_start_matches('v');
    let mut parts = trimmed.split('.');
    let major = parts.next()?.parse().ok()?;
    let minor = parts.next()?.parse().ok()?;
    let patch = parts.next()?.parse().ok()?;
    Some((major, minor, patch))
}

fn is_newer(current: &str, latest: &str) -> bool {
    match (parse_version(current), parse_version(latest)) {
        (Some(a), Some(b)) => b > a,
        _ => latest.trim() != current.trim(),
    }
}

pub async fn check_github_release(current_version: &str) -> Result<UpdateInfo, String> {
    let url = format!("https://api.github.com/repos/{GITHUB_REPO}/releases/latest");
    let client = reqwest::Client::builder()
        .user_agent("TMP3-Finder")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("GitHub API returned {}", response.status()));
    }

    let payload: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let latest_version = payload
        .get("tag_name")
        .and_then(|v| v.as_str())
        .map(|v| v.trim_start_matches('v').to_string());
    let release_url = payload
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("https://github.com/lindan133/tmp3-finder/releases/latest")
        .to_string();
    let release_notes = payload
        .get("body")
        .and_then(|v| v.as_str())
        .map(|v| v.to_string());

    let update_available = latest_version
        .as_deref()
        .map(|latest| is_newer(current_version, latest))
        .unwrap_or(false);

    Ok(UpdateInfo {
        current_version: current_version.to_string(),
        latest_version,
        update_available,
        release_url,
        release_notes,
    })
}
