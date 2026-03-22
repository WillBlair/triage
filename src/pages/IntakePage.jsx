import { useParams } from 'react-router-dom'
import PatientIntakeForm from '../components/PatientIntakeForm'

export default function IntakePage() {
  const { token } = useParams()
  return <PatientIntakeForm token={token} />
}
