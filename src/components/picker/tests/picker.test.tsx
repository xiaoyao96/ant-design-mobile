import React, { createRef, useState } from 'react'
import {
  render,
  fireEvent,
  waitFor,
  screen,
  sleep,
  act,
  waitForElementToBeRemoved,
} from 'testing'
import { basicColumns } from '../demos/columns-data'
import Picker, { PickerRef, PickerColumn } from '..'
import Button from '../../button'
import { useLockFn } from 'ahooks'

async function mockRequest() {
  await sleep(100)
  return basicColumns
}

describe('Picker', () => {
  test('renderLabel works', async () => {
    const { baseElement } = render(
      <Picker
        columns={basicColumns}
        visible={true}
        renderLabel={item => {
          return item.value
        }}
      />
    )

    expect(
      baseElement.textContent
        /**
         * aria contain -
         */
        ?.replace(/-/g, '')
    ).toContain('MonTuesWedThurFriampm')
  })

  test('test Picker render children with PickerActions and click cancel button', async () => {
    const afterShow = jest.fn()
    const onShow = jest.fn()
    const afterClose = jest.fn()
    const onClose = jest.fn()
    const onCancel = jest.fn()
    render(
      <Picker
        onCancel={onCancel}
        onShow={onShow}
        onClose={onClose}
        cancelText='取消'
        columns={basicColumns}
        afterShow={afterShow}
        afterClose={afterClose}
      >
        {(_, { toggle, open, close }) => (
          <>
            <Button onClick={toggle} data-testid='toggle'>
              toggle
            </Button>
            <Button onClick={open} data-testid='open'>
              open
            </Button>
            <Button onClick={close} data-testid='close'>
              close
            </Button>
          </>
        )}
      </Picker>
    )

    fireEvent.click(screen.getByTestId('toggle'))
    expect(onShow).toBeCalledTimes(1)
    await waitFor(() => expect(afterShow).toBeCalledTimes(1))
    fireEvent.click(screen.getByTestId('close'))
    expect(onClose).toBeCalledTimes(1)
    await waitFor(() => expect(afterClose).toBeCalledTimes(1))
    fireEvent.click(screen.getByTestId('open'))
    expect(onShow).toBeCalledTimes(2)
    await waitFor(() => expect(afterShow).toBeCalledTimes(2))
    fireEvent.click(screen.getByText('取消'))
    expect(onClose).toBeCalledTimes(2)
    await waitFor(() => expect(onCancel).toBeCalledTimes(1))
  })

  test('test Picker onMaskClick', async () => {
    const maskClassPrefix = 'adm-mask'
    const onCancel1 = jest.fn()
    const PickerTestComponent1 = () => {
      const [visible, setVisible] = useState(false)
      return (
        <>
          <Button onClick={() => setVisible(true)} data-testid={'button'}>
            button
          </Button>
          <Picker
            columns={basicColumns}
            visible={visible}
            onCancel={onCancel1}
          />
        </>
      )
    }
    const { unmount } = render(<PickerTestComponent1 />)

    fireEvent.click(screen.getByTestId('button'))
    await waitFor(() =>
      fireEvent.click(document.querySelectorAll(`.${maskClassPrefix}`)[0])
    )

    expect(onCancel1).toBeCalledTimes(1)
    unmount()

    const onCancel2 = jest.fn()
    const PickerTestComponent2 = () => {
      const [visible, setVisible] = useState(false)
      return (
        <>
          <Button onClick={() => setVisible(true)} data-testid={'button'}>
            button
          </Button>
          <Picker
            columns={basicColumns}
            visible={visible}
            onCancel={onCancel2}
            closeOnMaskClick={false}
          />
        </>
      )
    }

    render(<PickerTestComponent2 />)
    fireEvent.click(screen.getByTestId('button'))
    await waitFor(() =>
      fireEvent.click(document.querySelectorAll(`.${maskClassPrefix}`)[0])
    )
    expect(onCancel2).not.toBeCalled()
  })

  test('test imperative call', async () => {
    const fn = jest.fn()
    const onConfirm = jest.fn()
    const onClick = async () => {
      const value = await Picker.prompt({
        onConfirm,
        columns: basicColumns,
      })
      fn(value)
    }

    render(<Button onClick={onClick}>imperativePicker</Button>)
    const button = screen.getByText('imperativePicker')
    fireEvent.click(button)
    const cancel = await screen.findByText('取消')
    const popup = document.querySelectorAll('.adm-popup')[0]
    await act(() => sleep(0))
    fireEvent.click(cancel)
    await waitForElementToBeRemoved(popup)
    expect(fn.mock.calls[0][0]).toBeNull()

    fireEvent.click(button)
    const confirm = await screen.findByText('确定')
    const popup2 = document.querySelectorAll('.adm-popup')[0]
    await act(() => sleep(0))
    fireEvent.click(confirm)
    await waitForElementToBeRemoved(popup2)
    expect(fn.mock.calls[1][0]).toEqual(['Mon', 'am'])
    expect(onConfirm).toBeCalled()
  })

  test('test Picker should work given ref', async () => {
    const ref = createRef<PickerRef>()
    const afterShow = jest.fn()
    render(
      <Picker
        columns={basicColumns}
        afterShow={afterShow}
        closeOnMaskClick={false}
        ref={ref}
      />
    )
    act(() => {
      ref.current?.open()
    })
    await waitFor(() => expect(afterShow).toBeCalled())
  })

  test('test Picker should work with `placeholder`', async () => {
    const Wrapper = () => {
      const [visible, setVisible] = useState(false)
      const [columns, setColumns] = useState<PickerColumn[] | null>(null)
      const onShow = useLockFn(async () => {
        setColumns(await mockRequest())
      })
      return (
        <>
          <Button onClick={() => setVisible(true)} data-testid={'button'}>
            button
          </Button>
          <Picker
            placeholder={<div data-testid='placeholder'>loading</div>}
            columns={columns}
            visible={visible}
            onShow={onShow}
          />
        </>
      )
    }
    render(<Wrapper />)

    fireEvent.click(screen.getByTestId('button'))
    expect(screen.queryByTestId('placeholder')).toBeInTheDocument()
    await screen.findByText(basicColumns[0][0].label)
    expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument()
  })
})
