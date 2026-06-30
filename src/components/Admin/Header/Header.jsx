import { useEffect, useState } from 'react'
import { Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { api } from '@/api/index.js'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export default function Header({ onNavigate }) {
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    api.getNotifications?.().then(setNotifs).catch(() => setNotifs([]))
  }, [])

  function handleLogout() {
    // axiosClient.js lưu session ở nhiều nơi: localStorage (token, refreshToken,
    // role) và sessionStorage (auth_user). Trước đây chỉ xoá token/role nên
    // refreshToken và auth_user còn sót lại — có thể khiến app tự refresh lại
    // session hoặc ProtectedRoute vẫn coi là đã đăng nhập.
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('role')
    sessionStorage.removeItem('auth_user')
    window.dispatchEvent(new Event('auth-session-change'))
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card/80 px-6 backdrop-blur">
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell className="size-4" />
              {notifs.length > 0 ? (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-card" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Thông báo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">Không có thông báo</div>
            ) : (
              notifs.slice(0, 6).map(n => (
                <DropdownMenuItem key={n.id} className="flex items-start gap-3">
                  <span className="text-base">{n.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{n.text}</p>
                    <p className="text-xs text-muted-foreground">{n.time}</p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback className="bg-gradient-to-br from-primary to-rose-500 text-xs font-bold text-primary-foreground">
                  AD
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left text-xs sm:block">
                <div className="font-semibold">Admin</div>
                <div className="text-muted-foreground">Super Admin</div>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-rose-500 text-xs font-bold text-primary-foreground">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">Admin</div>
                  <Badge variant="outline" className="mt-0.5 h-4 text-[10px]">Super Admin</Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onNavigate?.('profile')}>
              <User className="size-4" />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
              <Settings className="size-4" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="size-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}