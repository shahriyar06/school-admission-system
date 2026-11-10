import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Render e kono error hole khali page na dekhiye ekta bujhar moto card dekhabe
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI render error', error, info.componentStack)
  }

  private reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto max-w-lg py-10">
        <Card>
          <CardHeader>
            <CardTitle>দুঃখিত, কিছু একটা সমস্যা হয়েছে</CardTitle>
            <CardDescription>
              এই অংশটি দেখাতে সমস্যা হচ্ছে। আবার চেষ্টা করুন, সমস্যা থাকলে page টি reload করুন।
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{this.state.error.message}</CardContent>
          <CardFooter className="gap-2">
            <Button onClick={this.reset}>আবার চেষ্টা করুন</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
}
