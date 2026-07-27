---
title: Minecraft 1.21.4 Forge 模组包
files:
  - label: 一键安装
    path: 一键安装.zip
  - label: Vanilla+ 地铁系统
    path: vanilla_metro-1.0.0.0.jar
  - label: Vanilla+ 自由传送
    path: vanilla_freetp-1.0.0.0.jar
  - label: JourneyMap 地图
    path: journeymap-forge-1.21.4-6.0.0-beta.47.jar
  - label: Dynamic Lights 动态光源
    path: dynamiclights-1.21.4.2.jar
  - label: Inventory Profiles Next 背包整理
    path: InventoryProfilesNext-forge-1.21.4-2.1.9.jar
  - label: libIPN（背包整理前置）
    path: libIPN-forge-1.21.4-6.5.1.jar
  - label: Kotlin for Forge（前置）
    path: kotlinforforge-5.12.0-all.jar
  - label: Forgematica 投影模组
    path: forgematica-0.4.4-forge+mc1.21.4.jar
  - label: MaFgLib (投影模组前置)
    path: mafglib-0.4.3-forge+mc1.21.4.jar
---
# Minecraft 1.21.4 Forge 模组包

适用于 **Minecraft Java 版 1.21.4** 的 Forge 模组集合，包含地铁与自由传送等玩法模组，以及地图、动态光源和背包整理等客户端增强功能。

## 版本要求

| 项目 | 要求 |
|---|---|
| Minecraft | **Java 版 1.21.4** |
| 模组加载器 | **Minecraft Forge 54.x 或更高版本**（限 1.21.4） |
| Java | **Java 21** |

> 请勿使用 Fabric、NeoForge 或其他 Minecraft 版本；它们无法加载本页的 Forge 模组。

## 服务端安装

将以下模组放入服务端根目录的 `mods/` 文件夹，并使用 Forge 1.21.4 启动服务器：

- `vanilla_metro-1.0.0.0.jar`：Vanilla+ 地铁系统。
- `vanilla_freetp-1.0.0.0.jar`：Vanilla+ 自由传送。

这两个模组均支持服务端与客户端使用；游玩地铁内容或使用自由传送的玩家，也应在客户端安装相同文件。

## 客户端安装

客户端同样需要使用 Forge 1.21.4。将要使用的 Jar 文件放入游戏目录 `.minecraft/mods/`：

| 模组 | 用途 | 是否需要前置 |
|---|---|---|
| Vanilla+ 地铁系统 | 原版矿车地铁、站台与信号控制 | 无 |
| Vanilla+ 自由传送 | 无需开启原版作弊即可使用传送指令 | 无 |
| JourneyMap | 实时小地图、全屏地图与路径点 | 无 |
| Dynamic Lights | 手持或掉落的发光物品提供动态照明 | 无 |
| Inventory Profiles Next | 整理背包、匹配物品、锁定槽位与装备方案 | `libIPN`、`Kotlin for Forge` |
| Forgematica | 投影模组，用于便捷建造建筑 | `MaFgLib` |

> `Inventory Profiles Next`、`libIPN` 与 `Kotlin for Forge` 为客户端功能，不需要放入服务端的 `mods/` 文件夹。

## 模组功能速览

- **Vanilla+ 地铁系统**：基于原版铁轨与矿车扩展地铁玩法，提供连挂棒、站台核心块、屏蔽门、闸机、线路总控面板、信号灯和施工法杖等内容。
- **Vanilla+ 自由传送**：在未开启原版“允许作弊”时提供 `tpp` 传送命令，并通过 `tps` 保存和复用命名地点；两者均支持 Tab 自动补全。
- **JourneyMap**：探索时自动记录地形，可查看小地图、全屏地图与路径点。
- **Dynamic Lights**：手持或掉落的发光物品会照亮周围环境。
- **Inventory Profiles Next**：快速整理物品栏、移动同类物品、批量丢弃、锁定槽位及管理装备方案。
- **ForgeMatica**：投影模组，目前只支持客户端部分，网络部分尚且不支持

## 常见问题

- **游戏或服务器无法启动**：确认 Minecraft 为 1.21.4、已使用 Forge，并运行在 Java 21 上。
- **背包整理模组报缺少依赖**：同时安装 `libIPN-forge-1.21.4-6.5.1.jar` 与 `kotlinforforge-5.12.0-all.jar` 与 `mafglib-0.4.3-forge+mc1.21.4.jar`。
- **客户端无法进入服务器**：客户端的 Vanilla+ 地铁与自由传送 Jar 请与服务器保持一致；仅客户端增强模组不必安装到服务器。
