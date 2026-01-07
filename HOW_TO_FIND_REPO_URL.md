# 📍 如何查看 GitHub 仓库 URL

## 方法 1: 在 GitHub 网页上查看

1. **访问你的 GitHub 主页**：
   - 打开：https://github.com/Jac0828
   - 或者：https://github.com/Jac0828?tab=repositories

2. **找到你的仓库**：
   - 在仓库列表中，找到你刚创建的仓库（例如：SkillChain）
   - 点击仓库名称进入

3. **复制仓库 URL**：
   - 在仓库页面，点击绿色的 **"Code"** 按钮
   - 你会看到仓库的 URL，例如：
     ```
     https://github.com/Jac0828/SkillChain.git
     ```
   - 或者直接看浏览器地址栏，URL 就是：
     ```
     https://github.com/Jac0828/SkillChain
     ```

## 方法 2: 如果你刚创建了仓库

如果你刚才在 https://github.com/new 创建了仓库：

1. **创建完成后**，GitHub 会显示一个页面
2. **页面上会显示**：
   - 仓库的完整 URL
   - 推送代码的指令
3. **URL 格式**通常是：
   ```
   https://github.com/你的用户名/仓库名
   ```

## 方法 3: 检查浏览器历史记录

如果你刚才创建了仓库：
- 查看浏览器地址栏
- 或者查看浏览器历史记录
- 找到类似 `https://github.com/Jac0828/xxx` 的链接

## 方法 4: 常见仓库名称

如果你创建了仓库但不确定名称，常见的可能是：
- `SkillChain`
- `skillchain`
- `Skill-Chain`
- `skill-chain`
- 或者其他你输入的名称

## 快速检查

运行以下命令检查仓库是否存在：

```bash
# 替换为你的仓库名
curl -I https://github.com/Jac0828/SkillChain
```

如果返回 `200 OK`，说明仓库存在！
如果返回 `404 Not Found`，说明仓库不存在或名称不对。

## 下一步

找到仓库 URL 后，告诉我：
- 完整的 URL（例如：`https://github.com/Jac0828/SkillChain`）
- 或者仓库名称（例如：`SkillChain`）

我就可以帮你推送代码了！

