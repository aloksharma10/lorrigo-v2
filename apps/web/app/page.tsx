import { prisma } from "@lorrigo/db"
import { Button } from "@lorrigo/ui/components/button"

export default async function Page() {
  const users = await prisma.user.findMany()
  console.log(users)
  return (
    <div className="flex items-center justify-center min-h-svh">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Hello World</h1>
        <Button size="sm">Button</Button>
      </div>
    </div>
  )
}
