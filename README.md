# 行驶留证

`driving-evidence-pwa` 是一个零付费自用 PWA，用于在行驶中一键保存当前时间和定位，停车后再补充车牌号和备注。

## 本地运行

```powershell
npm run serve
```

然后打开：

```text
http://127.0.0.1:8080/
```

## 部署

项目已准备 GitHub Pages 工作流，部署内容来自 `pwa/` 目录。

推送到 GitHub 仓库 `driving-evidence-pwa` 的 `main` 分支后，GitHub Actions 会发布 PWA。
