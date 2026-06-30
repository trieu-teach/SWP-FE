import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { LABEL_EDITOR_BOARD } from '@/constants/roleTerminology.js'

export function SidebarFlow({ onRefresh }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-base">Luồng công việc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">Lần đầu</p>
          <p>Mangaka → Tantou → {LABEL_EDITOR_BOARD}</p>
          <p className="mt-1 text-xs">
            <code className="rounded bg-muted px-1">Draft → EditorReview → EBReview → Publishing</code>
          </p>
        </div>
        <Separator />
        <div>
          <p className="font-medium text-foreground">Phát hành định kỳ</p>
          <p>Studio → Ready → {LABEL_EDITOR_BOARD} duyệt → Published</p>
          <p className="mt-1 text-xs">Tantou theo dõi tiến độ, không duyệt chapter.</p>
        </div>
        <Separator />
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
        >
          Tải lại dữ liệu
        </Button>
      </CardContent>
    </Card>
  )
}