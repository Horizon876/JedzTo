import { ILocationPermissionComponentProps } from '@/lib/utils/interfaces'

/** Kitchen / delivery staff app does not require GPS to operate. */
export default function LocationPermissionComponent({
  children,
}: ILocationPermissionComponentProps) {
  return children
}
