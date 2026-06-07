# Mac / iOS 开发接手说明

## 当前项目状态

当前项目是一个静态 PWA，不是 Xcode 工程。它已经可以在浏览器或 GitHub Pages 中运行，用于行驶中保存当前时间和系统原始定位，停车后补充车牌号和备注。

GitHub Pages 当前访问地址：

```text
https://clancywy.github.io/driving-evidence-pwa/?v=11
```

## 到 Mac 后先验证 PWA

解压项目后，在项目根目录执行：

```bash
npm test
```

本地预览可以执行：

```bash
npm run serve
```

如果 Mac 上 `python` 命令不可用，改用：

```bash
python3 -m http.server 8080 --directory pwa
```

然后打开：

```text
http://127.0.0.1:8080/
```

## 当前核心功能

- 行驶中显示当前日期、时间、定位状态和地图。
- 点击 `保存当前时间` 后保存当前时间和定位。
- 处理记录页用横向卡片显示记录。
- 处理记录卡片包含地图、车牌号、备注、保存补充信息和删除。
- 记录保存在浏览器 `localStorage`。
- 地图使用系统原始经纬度，不做 GCJ/WGS 坐标转换。
- 浏览器定位使用 `watchPosition()`，参数为：

```js
enableHighAccuracy: true
timeout: 5000
maximumAge: 1000
```

## 迁移到原生 iOS App 的建议

建议先做一个简单 SwiftUI 版本，功能保持和 PWA 一致：

- SwiftUI 做两页：`行驶中`、`处理记录`。
- CoreLocation 获取定位。
- MapKit 显示当前位置和保存位置。
- 本地 JSON 或 UserDefaults 保存记录。
- 保持系统原始坐标，不做坐标转换。
- 保存记录的数据结构沿用当前 PWA：
  - 保存时间
  - 显示日期
  - 显示时间
  - 纬度
  - 经度
  - 定位精度
  - 车牌号
  - 备注

## iOS 权限

原生 iOS App 至少需要定位权限说明：

```text
NSLocationWhenInUseUsageDescription
```

说明文案建议：

```text
用于在保存行驶记录时记录当前位置，方便停车后对照行车记录仪处理。
```

## 注意事项

- 高速行驶时，定位实际刷新频率由 iOS 和 GPS 状态决定，代码只能请求高精度和较短缓存。
- MapKit 在原生 iOS App 中可以直接使用，不需要额外购买地图服务。
- 如果只是自用测试，可以先用 Xcode 安装到自己的 iPhone；免费 Apple ID 通常需要定期重新签名。
