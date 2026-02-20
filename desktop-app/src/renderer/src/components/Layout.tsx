import { Outlet, NavLink } from "react-router-dom"
import { FileUp, TableProperties, FileText, Settings } from "lucide-react"

export function Layout() {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card flex flex-col backdrop-blur-md bg-opacity-95">
                <div className="h-14 flex items-center px-4 border-b border-border">
                    <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">FinAnalysis LLM</h2>
                </div>
                <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
                    <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                        <FileUp size={18} /><span>导入与解析</span>
                    </NavLink>
                    <NavLink to="/verification" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                        <TableProperties size={18} /><span>大表面板校对</span>
                    </NavLink>
                    <NavLink to="/reporting" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                        <FileText size={18} /><span>智能推演报告</span>
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-border">
                    <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'}`}>
                        <Settings size={18} /><span>模型设置与密钥</span>
                    </NavLink>
                </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 relative overflow-auto bg-background/50">
                <Outlet />
            </div>
        </div>
    )
}
