# 一家店

用一家快餐店看餐饮：定位、堂食、外卖、保本碗数。打开网页就能点图、改数字。

算法在 `internal/logic`，页面在 `web`。页面负责画，规则负责算。

## 打开

需要已安装 Go。

```bash
go run ./cmd/server
```

浏览器打开 http://localhost:8081

## 在 CentOS 云主机上部署

需要 root。第一次：

```bash
git clone <你的仓库地址>
cd canyin
sudo bash deploy.sh
```

以后更新代码：

```bash
git pull
sudo bash deploy.sh
```

脚本会安装编译用的 Go、编译程序、设置开机自启，并在本机防火墙放行 8081。

云主机的安全组也要放行 TCP 8081。完成后用 `http://公网IP:8081` 打开。

查看是否在跑：`systemctl status canyin`

四页：

- 基础模型：点平面图上的每一块
- 算账器：改月租和渠道，看钱柜有没有被填满
- 三个必答：三个问题、客群、租房前的三道门
- 商业模式：周围 5000 人里留下 200 个每天来的人，以及之后的三条路
- 核心产品设计：一道菜要同时过给谁吃、做得稳、账上留得下
